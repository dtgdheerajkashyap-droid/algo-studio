"""Sync guard: the solutions the app *shows* users must pass the judge.

The frontend's Solution tab ships reference code per algorithm (in
frontend/src/engine/algorithms/solutions/*.ts). Where the Python one is a
complete stdin→stdout program, run it against this backend's test cases — if
the two drift apart, a learner who copies the official answer gets "wrong
answer", which is exactly what happened to the four ML problems before.
"""

import re
from pathlib import Path

import pytest

from app.algorithms import ALGORITHMS
from app.runner import run_submission

SOLUTIONS_DIR = Path(__file__).resolve().parents[2] / "frontend" / "src" / "engine" / "algorithms" / "solutions"

# Solution-file stem for algorithm ids whose file name differs.
_FILE_STEM = {"k-nearest-neighbors": "knn", "k-means": "kmeans"}


def _python_program(algorithm_id: str) -> str | None:
    path = SOLUTIONS_DIR / f"{_FILE_STEM.get(algorithm_id, algorithm_id)}-solutions.ts"
    if not path.is_file():
        return None
    m = re.search(r"const python = `(.*?)`;", path.read_text(encoding="utf-8"), re.S)
    if not m:
        return None
    # Undo JS template-literal escaping.
    code = m.group(1).replace("\\`", "`").replace("\\${", "${").replace("\\\\", "\\")
    # Function-only snippets (no IO harness) can't be judged directly.
    return code if "def main" in code else None


_JUDGEABLE = {aid: code for aid in sorted(ALGORITHMS) if (code := _python_program(aid))}


@pytest.mark.skipif(not SOLUTIONS_DIR.is_dir(), reason="frontend sources not present")
def test_ml_solutions_are_judgeable():
    # The ML problems are the ones that ship full programs; make sure the
    # guard below actually covers them rather than silently skipping.
    for aid in ("k-nearest-neighbors", "k-means", "linear-regression", "perceptron"):
        assert aid in _JUDGEABLE, f"no full Python program found for {aid}"


@pytest.mark.parametrize("algorithm_id", sorted(_JUDGEABLE))
def test_shown_python_solution_is_accepted(algorithm_id):
    report = run_submission("python", _JUDGEABLE[algorithm_id], ALGORITHMS[algorithm_id].tests)
    failed = [r.label for r in report.results if not r.passed]
    assert report.status == "accepted", f"{algorithm_id} shown solution fails: {failed}"
