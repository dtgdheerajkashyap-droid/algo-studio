"""Local code runner — executes submissions via subprocess with timeouts.

Python works out of the box (sys.executable). C++/Java run only when g++ /
javac+java are on PATH; otherwise the caller gets a friendly "toolchain not
installed" error. Judge0 could replace this later behind the same interface.

Security posture (defense-in-depth, not a full sandbox):
  * When RUNNER_UID/RUNNER_GID are set (the Docker image does this), every
    child — compiler included — drops to that unprivileged user. Without this,
    submitted code runs as the server's user and can read the server's
    secrets via /proc/1/environ, the SQLite file, or `#include "/proc/..."`
    compile errors, and can kill the server process.
  * At most MAX_CONCURRENT_RUNS submissions execute at once.
  * Subprocesses get a scrubbed environment (no API keys / JWT secrets).
  * Working dir is an isolated tempdir removed on return.
  * On POSIX platforms, `resource.setrlimit` caps VM, FDs, and CPU.
  * On Windows, Win32 job objects via CREATE_SUSPENDED are not used here
    (keeps pure-Python); the user is expected to run this behind a container
    boundary in production.
  * Network access is NOT blocked; deploy with container networking policies.
"""

import functools
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path

try:
    # Imported here, not inside the forked child: importing after fork in a
    # multithreaded server can deadlock on the import lock.
    import resource  # POSIX only
except ImportError:
    resource = None  # type: ignore[assignment]

from .algorithms import TestCase
from .config import settings

RUN_TIMEOUT_S = 5
COMPILE_TIMEOUT_S = 30
MAX_OUTPUT_CHARS = 10_000
QUEUE_WAIT_S = 30

_run_slots = threading.BoundedSemaphore(max(1, settings.max_concurrent_runs))


class RunnerBusy(Exception):
    """All execution slots stayed occupied for QUEUE_WAIT_S."""

# Scrubbed subprocess environment — only these variables pass through.
# Omits JWT_SECRET, API keys, DB URLs, AWS/GCP metadata env, etc.
_ENV_ALLOWLIST = {
    "PATH",
    "SYSTEMROOT",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "LANGUAGE",
    "PYTHONIOENCODING",
    "PYTHONUNBUFFERED",
}


def _subprocess_env(*, workdir: Path | None = None) -> dict[str, str]:
    """Return a minimal, safe environment dict for the child process.

    HOME / USERPROFILE are deliberately NOT forwarded from the parent process.
    For Python subprocesses we additionally enable PYTHONSAFEPATH (3.11+) and
    set HOME / USERPROFILE explicitly to the isolated tempdir so that the
    script can't read `~/.ssh`, `~/.aws`, `~/.env`, or anything else the
    server user's home directory might contain. Workdir also becomes
    `HOME` so relative imports from ../../ will still be inside the scratch
    directory (because realpath of `..` inside the tmpdir stays in tmpdir).
    """
    env = {
        k: v
        for k, v in os.environ.items()
        if k in _ENV_ALLOWLIST
    }
    # Make accidental network calls less useful: strip cloud metadata hints.
    for k in list(env.keys()):
        if "AWS" in k or "GCP" in k or "AZURE" in k or "TOKEN" in k or "SECRET" in k or "KEY" in k:
            env.pop(k, None)
    # Force predictable text-mode encoding for Python stdio.
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"
    # Hardened Python interpreter flags:
    #   PYTHONSAFEPATH — don't add script dir / cwd to sys.path (blocks
    #     relative import attacks like `import os` via a local `os.py` file).
    #     Available Python 3.11+.
    #   PYTHONNOUSERSITE — ignore ~/.local/lib site-packages (defense in
    #     depth since we also override HOME).
    env["PYTHONSAFEPATH"] = "1"
    env["PYTHONNOUSERSITE"] = "1"
    if workdir is not None:
        safe_home = str(workdir.resolve())
        env["HOME"] = safe_home
        env["USERPROFILE"] = safe_home
        env["HOMEDRIVE"], env["HOMEPATH"] = _split_drive(safe_home)
    # Ensure TMP/TEMP/TMPDIR also resolve inside the scratch dir if possible.
    if workdir is not None:
        tmp = str((workdir / "tmp").resolve())
        try:
            os.makedirs(tmp, exist_ok=True)
        except OSError:
            pass
        env["TMPDIR"] = tmp
        env["TMP"] = tmp
        env["TEMP"] = tmp
    return env


def _split_drive(path: str) -> tuple[str, str]:
    """Split a windows path like C:\\foo into ('C:', '\\foo')."""
    if len(path) >= 2 and path[1] == ":":
        return path[:2], path[2:] or "\\"
    return "", path


def _apply_posix_rlimits(*, max_mem_mb: int = 256, limit_procs: bool = False) -> None:
    """Best-effort POSIX resource cap (memory / fds / CPU). No-op on Windows.

    Called via `preexec_fn` inside each test subprocess — not applied during
    compile steps since g++ can legitimately use >256 MB on heavy templates.
    """
    if resource is None:
        return
    max_mem_bytes = max_mem_mb * 1024 * 1024
    try:
        resource.setrlimit(resource.RLIMIT_AS, (max_mem_bytes, max_mem_bytes * 2))
    except (ValueError, OSError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (256, 512))
    except (ValueError, OSError):
        pass
    # Hard CPU wall (beyond the subprocess timeout — safety net for runaway procs)
    try:
        # soft < hard is required; (soft, 0) raises ValueError and was a no-op.
        resource.setrlimit(resource.RLIMIT_CPU, (RUN_TIMEOUT_S + 2, RUN_TIMEOUT_S + 3))
    except (ValueError, OSError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    except (ValueError, OSError, AttributeError):
        pass
    # Fork-bomb guard. NPROC is counted per uid, so it's only safe when the
    # child runs as the dedicated runner user (decided by the parent — inside
    # the child we've already dropped root and can't tell).
    if limit_procs:
        try:
            resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
        except (ValueError, OSError, AttributeError):
            pass


def _sandbox_user() -> tuple[int, int] | None:
    """(uid, gid) to drop to, or None when not configured / not possible."""
    if settings.runner_uid is None or platform.system() == "Windows":
        return None
    if os.geteuid() != 0:  # can't switch users without root
        return None
    gid = settings.runner_gid if settings.runner_gid is not None else settings.runner_uid
    return settings.runner_uid, gid


def _hand_workdir_to_sandbox(workdir: Path) -> None:
    """Let the sandbox user read sources and write build outputs in workdir."""
    user = _sandbox_user()
    if user is None:
        return
    uid, gid = user
    for root, dirs, files in os.walk(workdir):
        os.chown(root, uid, gid)
        for name in files:
            os.chown(os.path.join(root, name), uid, gid)


def _run_kwargs(*, rlimits: bool = False, workdir: Path) -> dict:
    """Common kwargs for every subprocess.run we spawn."""
    kwargs: dict = {
        "env": _subprocess_env(workdir=workdir),
        "text": True,
        "capture_output": True,
    }
    sandbox = _sandbox_user()
    if sandbox is not None:
        # Every child drops to the sandbox user — compile steps too, since
        # `#include "/proc/1/environ"` would otherwise echo server secrets
        # back in the compiler error. subprocess switches uid/gid before
        # running preexec_fn, so the rlimits below are set as that user.
        kwargs["user"], kwargs["group"] = sandbox
        kwargs["extra_groups"] = []
    if rlimits and platform.system() != "Windows":
        # preexec_fn runs in the child after fork, before exec.
        kwargs["preexec_fn"] = functools.partial(
            _apply_posix_rlimits, limit_procs=sandbox is not None
        )
    return kwargs


@dataclass
class TestOutcome:
    label: str | None
    passed: bool
    hidden: bool
    output: str | None = None  # populated for non-hidden failures
    expected: str | None = None

    def to_dict(self) -> dict:
        d = {"label": self.label, "passed": self.passed, "hidden": self.hidden}
        if self.output is not None:
            d["output"] = self.output
        if self.expected is not None:
            d["expected"] = self.expected
        return d


@dataclass
class RunReport:
    status: str  # accepted | wrong-answer | error
    results: list[TestOutcome]
    error_message: str | None = None  # compile/toolchain error shown to the user


class ToolchainMissing(Exception):
    def __init__(self, language: str, needed: str):
        self.language = language
        super().__init__(
            f"{language} submissions need {needed} installed on the server. "
            f"This machine doesn't have it — try Python, or install the toolchain."
        )


def _truncate(s: str) -> str:
    return s if len(s) <= MAX_OUTPUT_CHARS else s[:MAX_OUTPUT_CHARS] + "…(truncated)"


def _normalize(s: str) -> str:
    """Compare ignoring trailing whitespace per line and trailing newlines."""
    return "\n".join(line.rstrip() for line in s.strip().splitlines()).strip()


def _run_tests(cmd: list[str], tests: list[TestCase], cwd: Path) -> RunReport:
    results: list[TestOutcome] = []
    any_error = False
    run_kw = _run_kwargs(rlimits=True, workdir=cwd)
    for t in tests:
        try:
            proc = subprocess.run(
                cmd,
                input=t.input,
                timeout=RUN_TIMEOUT_S,
                cwd=cwd,
                **run_kw,
            )
            if proc.returncode != 0:
                any_error = True
                out = _truncate(proc.stderr.strip() or f"exit code {proc.returncode}")
                results.append(
                    TestOutcome(
                        t.label, False, t.hidden,
                        output=None if t.hidden else out,
                        expected=None if t.hidden else t.expected,
                    )
                )
                continue
            actual = proc.stdout
            passed = _normalize(actual) == _normalize(t.expected)
            results.append(
                TestOutcome(
                    t.label, passed, t.hidden,
                    output=None if (passed or t.hidden) else _truncate(actual.strip()),
                    expected=None if (passed or t.hidden) else t.expected,
                )
            )
        except subprocess.TimeoutExpired:
            any_error = True
            results.append(
                TestOutcome(
                    t.label, False, t.hidden,
                    output=None if t.hidden else f"time limit exceeded ({RUN_TIMEOUT_S}s)",
                    expected=None if t.hidden else t.expected,
                )
            )
    if all(r.passed for r in results):
        status = "accepted"
    elif any_error:
        status = "error"
    else:
        status = "wrong-answer"
    return RunReport(status=status, results=results)


def run_submission(language: str, code: str, tests: list[TestCase]) -> RunReport:
    """Compile (if needed) and run `code` against every test case.

    Blocks for a free execution slot; raises RunnerBusy if none frees up.
    """
    if not _run_slots.acquire(timeout=QUEUE_WAIT_S):
        raise RunnerBusy()
    try:
        return _run_submission(language, code, tests)
    finally:
        _run_slots.release()


def _run_submission(language: str, code: str, tests: list[TestCase]) -> RunReport:
    with tempfile.TemporaryDirectory(prefix="algostudio-") as tmp:
        workdir = Path(tmp)
        compile_kw = _run_kwargs(rlimits=False, workdir=workdir)

        if language == "python":
            src = workdir / "main.py"
            src.write_text(code, encoding="utf-8")
            _hand_workdir_to_sandbox(workdir)
            return _run_tests([sys.executable, str(src)], tests, workdir)

        if language == "cpp":
            gpp = shutil.which("g++") or shutil.which("clang++")
            if not gpp:
                raise ToolchainMissing("C++", "a C++ compiler (g++ or clang++)")
            src = workdir / "main.cpp"
            exe = workdir / ("main.exe" if sys.platform == "win32" else "main")
            src.write_text(code, encoding="utf-8")
            _hand_workdir_to_sandbox(workdir)
            compile_proc = subprocess.run(
                [gpp, "-O2", "-std=c++17", str(src), "-o", str(exe)],
                timeout=COMPILE_TIMEOUT_S,
                cwd=workdir,
                **compile_kw,
            )
            if compile_proc.returncode != 0:
                return RunReport(
                    status="error", results=[],
                    error_message="Compilation failed:\n" + _truncate(compile_proc.stderr),
                )
            return _run_tests([str(exe)], tests, workdir)

        if language == "java":
            javac, java = shutil.which("javac"), shutil.which("java")
            if not javac or not java:
                raise ToolchainMissing("Java", "a JDK (javac + java)")
            src = workdir / "Main.java"
            src.write_text(code, encoding="utf-8")
            _hand_workdir_to_sandbox(workdir)
            compile_proc = subprocess.run(
                [javac, str(src)],
                timeout=COMPILE_TIMEOUT_S,
                cwd=workdir,
                **compile_kw,
            )
            if compile_proc.returncode != 0:
                return RunReport(
                    status="error", results=[],
                    error_message="Compilation failed:\n" + _truncate(compile_proc.stderr),
                )
            return _run_tests([java, "-cp", str(workdir), "Main"], tests, workdir)

        raise ValueError(f"Unsupported language: {language}")
