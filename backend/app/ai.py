"""AI integration — multi-provider tutor chat + submission feedback.

Degrades gracefully: without any API key in backend/.env, is_configured()
is False, submissions skip AI feedback, and the tutor streams a friendly
"not configured" message instead of erroring.

Provider order (first configured wins; all are free or have free tiers):
  1. Anthropic (ANTHROPIC_API_KEY)     — claude-opus-5-5 (override: ANTHROPIC_MODEL)
  2. OpenAI    (OPENAI_API_KEY)        — gpt-4o-mini
  3. Groq      (GROQ_API_KEY)          — llama-3.3-70b-versatile  (free tier: 14k req/day)
  4. OpenRouter(OPENROUTER_API_KEY)    — mistral-7b-instruct:free  (free models available)
  5. Google    (GEMINI_API_KEY)        — gemini-2.5-flash          (free: 15 RPM / 1M TPD)
  6. Ollama    (OLLAMA_BASE_URL)       — llama3.2 (local, no key, truly free)
"""

import asyncio
import importlib
import os
from collections.abc import AsyncIterator

from .config import settings

ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5-5")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "mistralai/mistral-7b-instruct:free")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")

# Hard per-request caps to prevent a stalled provider from tying up server workers.
# Stream (tutor): longer timeout because first token may take 5–15s on slow providers.
# One-shot (feedback): shorter because we don't stream.
_STREAM_TIMEOUT_S = 60
_FEEDBACK_TIMEOUT_S = 20

_PROVIDER_ORDER = (
    "anthropic",
    "openai",
    "groq",
    "openrouter",
    "gemini",
    "ollama",
)

_OPENAI_COMPATIBLE_PROVIDERS = ("openai", "groq", "openrouter", "ollama")

_provider_clients: dict = {}

NOT_CONFIGURED_MESSAGE = (
    "The AI tutor isn't configured yet — the server has no API key or local model running. "
    "Add any of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, "
    "GEMINI_API_KEY to backend/.env (or set OLLAMA_BASE_URL + run a local model via `ollama run llama3.2`) "
    "then restart the backend. Everything else (visualizer, practice tests, progress) still works."
)

# ---------------------------------------------------------------- provider plumbing


def _active_provider() -> str:
    if settings.anthropic_api_key:
        return "anthropic"
    if settings.openai_api_key:
        return "openai"
    if settings.groq_api_key:
        return "groq"
    if settings.openrouter_api_key:
        return "openrouter"
    if settings.gemini_api_key:
        return "gemini"
    if settings.ollama_base_url and settings.ollama_base_url.strip():
        return "ollama"
    return "none"


def is_configured() -> bool:
    return _active_provider() != "none"


def _provider_model(provider: str) -> str | None:
    return {
        "anthropic": ANTHROPIC_MODEL,
        "openai": OPENAI_MODEL,
        "groq": GROQ_MODEL,
        "openrouter": OPENROUTER_MODEL,
        "gemini": GEMINI_MODEL,
        "ollama": OLLAMA_MODEL,
    }.get(provider)


def configured_provider_info() -> dict:
    p = _active_provider()
    m = _provider_model(p)
    if p != "none":
        return {"configured": True, "provider": p, "model": m}
    return {"configured": False, "provider": None, "model": None}


def _require_package(pkg: str, install_hint: str):
    """Lazy import with a clear install error for optional SDKs."""
    try:
        # import_module returns the leaf module ("google.generativeai"), unlike
        # __import__ which returns the top-level package ("google").
        return importlib.import_module(pkg)
    except ImportError as e:
        raise RuntimeError(install_hint) from e


def _get_client(provider: str):
    """Return a configured SDK client (cached), raising RuntimeError if the
    required package isn't installed."""
    if provider in _provider_clients:
        return _provider_clients[provider]

    if provider == "anthropic":
        anthropic = _require_package(
            "anthropic",
            "ANTHROPIC_API_KEY is set but the 'anthropic' package is not installed. Run: pip install anthropic",
        )
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    elif provider in _OPENAI_COMPATIBLE_PROVIDERS:
        openai_mod = _require_package(
            "openai",
            f"{provider.upper()} requires the 'openai' SDK (OpenAI-compatible clients). Run: pip install openai",
        )
        kwargs: dict = {}
        if provider == "openai":
            kwargs["api_key"] = settings.openai_api_key
        elif provider == "groq":
            kwargs["api_key"] = settings.groq_api_key
            kwargs["base_url"] = "https://api.groq.com/openai/v1"
        elif provider == "openrouter":
            kwargs["api_key"] = settings.openrouter_api_key
            kwargs["base_url"] = "https://openrouter.ai/api/v1"
        elif provider == "ollama":
            # Ollama local server ignores api_key value but SDK still requires a string
            kwargs["api_key"] = "ollama"
            kwargs["base_url"] = settings.ollama_base_url or OLLAMA_BASE_URL
        client = openai_mod.AsyncOpenAI(**kwargs)
    elif provider == "gemini":
        google = _require_package(
            "google.generativeai",
            "GEMINI_API_KEY is set but 'google-generativeai' is not installed. Run: pip install google-generativeai",
        )
        google.configure(api_key=settings.gemini_api_key)
        client = google  # module-level singleton, no class client here
    else:
        raise RuntimeError(f"Unknown provider: {provider}")

    _provider_clients[provider] = client
    return client


def startup_probe() -> dict:
    """Called once at app startup. Returns a human-readable summary; never
    raises (degraded-service is fine, surprise boot-crash is not)."""
    p = _active_provider()
    if p == "none":
        return {"configured": False, "note": "No LLM provider configured — tutor disabled."}
    try:
        _get_client(p)
    except RuntimeError as e:
        return {
            "configured": False,
            "provider": p,
            "warning": str(e),
        }
    return {"configured": True, "provider": p, "model": _provider_model(p)}


def _friendly_error(e: Exception) -> str:
    """Turn known provider error codes into user-friendly one-liners."""
    msg = getattr(e, "message", str(e)) or ""
    low = msg.lower()
    if (
        "insufficient_quota" in msg
        or "credit_balance_exhausted" in msg
        or "you have no credits remaining" in low
        or "quota exceeded" in low
    ):
        return (
            "That provider's account has no API credits left — "
            "the tutor request couldn't be sent. Top up the billing balance, "
            "switch to a different API key in backend/.env, or try Ollama locally for free."
        )
    if "invalid_api_key" in msg or "invalid authentication" in low:
        return "The API key in backend/.env is invalid. Double-check it and restart the backend."
    if "rate_limit" in msg or "rate limit" in low:
        return "The provider is rate-limiting requests right now. Wait a moment and try again."
    if "bad gateway" in low or "502" in low or "503" in low:
        return "The AI provider's API is temporarily down. Try again in a minute."
    if "connection refused" in low and "11434" in msg:
        return "Ollama isn't running on this machine. Start it with: ollama serve && ollama run llama3.2"
    return f"AI error: {msg[:220]}"


# ---------------------------------------------------------------- chat (streaming)

TUTOR_SYSTEM = """You are the AI tutor inside Algorithm Studio, a 3D algorithm visualizer.
The student is watching a step-by-step visualization of {algorithm_name} and can ask you about it.

You are given the student's current playback step and a window of recent visualization
events (JSON). Ground your answers in those concrete events — refer to the actual values
being compared, swapped, visited, or enqueued when relevant.

Rules:
- Be concise and friendly; this renders in a small chat panel, so prefer short paragraphs.
- Plain text only — no markdown headings, no code fences unless the student asks for code.
- Teach; don't just answer. Briefly explain the why behind each step.
- If asked to just write the full solution for the practice problem, guide instead:
  give hints and explain the idea, not a complete copy-pasteable solution."""


def _build_tutor_prompts(algorithm_name: str, statement: str, question: str, history: list[dict], step: int, context: list[dict]):
    context_lines = "\n".join(f"step {c.get('step')}: {c.get('event')}" for c in context)
    grounding = (
        f"[Playback state] The student is at step {step}. Recent events:\n"
        f"{context_lines or '(no events — playback not started)'}\n\n"
        f"[Practice problem] {statement}\n\n"
        f"[Question] {question}"
    )
    filtered = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    filtered.append({"role": "user", "content": grounding})
    system = TUTOR_SYSTEM.format(algorithm_name=algorithm_name)
    return system, filtered


async def _chat_anthropic(system: str, messages: list[dict]) -> AsyncIterator[str]:
    client = _get_client("anthropic")
    async with client.messages.stream(
        model=ANTHROPIC_MODEL,
        max_tokens=8000,  # thinking is always on for Opus 5.5 and counts toward this
        system=system,
        messages=messages,
        timeout=_STREAM_TIMEOUT_S,
    ) as stream:
        async for text in stream.text_stream:
            yield text
        final = await stream.get_final_message()
        if final.stop_reason == "refusal":
            yield "\n\n(I can't help with that request — try asking about the algorithm.)"


async def _chat_openai_compatible(provider: str, system: str, messages: list[dict]) -> AsyncIterator[str]:
    """Shared implementation for openai / groq / openrouter / ollama (OpenAI SDK)."""
    from openai import APIError

    client = _get_client(provider)
    model = _provider_model(provider)
    stream = await client.chat.completions.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "system", "content": system}, *messages],
        stream=True,
        timeout=_STREAM_TIMEOUT_S,
        # Ollama <0.2 doesn't accept `stream_options`; tolerate for providers that ignore unknown fields
        extra_body=(
            {"include_reasoning": True}
            if provider == "openrouter"
            else None
        ),
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        content = delta.content
        if content:
            yield content
        reasoning = getattr(delta, "reasoning_content", None)
        if reasoning:
            # OpenRouter's reasoning tokens — don't spam them to the user, we just ignore.
            pass


async def _chat_gemini(system: str, messages: list[dict]) -> AsyncIterator[str]:
    client = _get_client("gemini")
    # Flatten to a chat session (Gemini has roles user/model, so we convert assistant→model).
    # We prepend the system prompt as the first user turn, followed by the history.
    combined = [{"role": "user", "parts": [f"[System instruction]\n{system}"]}]
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        combined.append({"role": role, "parts": [m["content"]]})
    # Gemini Python SDK exposes generate_content_async(..., stream=True) on a GenerativeModel.
    model = client.GenerativeModel(GEMINI_MODEL)
    async for chunk in await model.generate_content_async(combined, stream=True):
        if chunk.candidates and chunk.candidates[0].content.parts:
            for part in chunk.candidates[0].content.parts:
                txt = getattr(part, "text", None)
                if txt:
                    yield txt


async def stream_tutor_reply(
    algorithm_name: str,
    statement: str,
    question: str,
    history: list[dict],
    step: int,
    context: list[dict],
) -> AsyncIterator[str]:
    """Yield text chunks of the tutor's reply."""
    provider = _active_provider()
    if provider == "none":
        yield NOT_CONFIGURED_MESSAGE
        return

    system, messages = _build_tutor_prompts(algorithm_name, statement, question, history, step, context)
    try:
        if provider == "anthropic":
            async for c in _chat_anthropic(system, messages):
                yield c
        elif provider in _OPENAI_COMPATIBLE_PROVIDERS:
            async for c in _chat_openai_compatible(provider, system, messages):
                yield c
        elif provider == "gemini":
            async for c in _chat_gemini(system, messages):
                yield c
    except Exception as e:
        # RuntimeError from _get_client; everything else from SDK
        err = _friendly_error(e)
        yield f"\n\n({err})"


# ---------------------------------------------------------------- feedback (non-streaming)

FEEDBACK_SYSTEM = """You review a student's algorithm-practice submission inside Algorithm Studio.
Write 2-4 sentences of plain-text feedback (no markdown). Address the student as "you".

- If tests failed: point toward the likely bug without writing the corrected code outright.
- If all tests passed: confirm the approach, then note one genuine improvement if any
  (complexity, style, edge cases). Don't invent problems.
- The problem statement may require a specific algorithm (e.g. bubble sort — no built-in
  sorts). If the code clearly bypasses the required algorithm, flag it clearly."""


def _build_feedback_prompt(algorithm_name: str, statement: str, language: str, code: str, status: str, failed_labels: list[str]) -> str:
    failures = ", ".join(failed_labels) if failed_labels else "none"
    return (
        f"Problem: {algorithm_name}\n{statement}\n\n"
        f"Language: {language}\nResult: {status}\nFailed tests: {failures}\n\n"
        f"Student code:\n```\n{code}\n```"
    )


async def _feedback_anthropic(prompt: str) -> str | None:
    client = _get_client("anthropic")
    msg = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4000,  # headroom for thinking tokens
        system=FEEDBACK_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        timeout=_FEEDBACK_TIMEOUT_S,
    )
    if msg.stop_reason == "refusal":
        return None
    out = "".join(b.text for b in msg.content if b.type == "text").strip()
    return out or None


async def _feedback_openai_compatible(provider: str, prompt: str) -> str | None:
    client = _get_client(provider)
    model = _provider_model(provider)
    res = await client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": FEEDBACK_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        timeout=_FEEDBACK_TIMEOUT_S,
    )
    if not res.choices:
        return None
    content = res.choices[0].message.content
    if not content:
        return None
    out = content.strip()
    if not out:
        return None
    return out


async def _feedback_gemini(prompt: str) -> str | None:
    client = _get_client("gemini")
    model = client.GenerativeModel(
        GEMINI_MODEL,
        system_instruction=FEEDBACK_SYSTEM,
    )
    res = await model.generate_content_async(prompt)
    try:
        out = res.text.strip()
        return out or None
    except (AttributeError, ValueError):
        return None


async def submission_feedback(
    algorithm_name: str,
    statement: str,
    language: str,
    code: str,
    status: str,
    failed_labels: list[str],
) -> str | None:
    """One-shot feedback on a submission; None when AI is unavailable or errors.

    Wrapped in asyncio.wait_for as a last-resort cap so slow providers don't
    block the submissions response indefinitely.
    """
    provider = _active_provider()
    if provider == "none":
        return None
    prompt = _build_feedback_prompt(algorithm_name, statement, language, code, status, failed_labels)

    async def _call():
        try:
            if provider == "anthropic":
                return await _feedback_anthropic(prompt)
            if provider in _OPENAI_COMPATIBLE_PROVIDERS:
                return await _feedback_openai_compatible(provider, prompt)
            if provider == "gemini":
                return await _feedback_gemini(prompt)
        except Exception:
            return None
        return None

    try:
        return await asyncio.wait_for(_call(), timeout=_FEEDBACK_TIMEOUT_S)
    except asyncio.TimeoutError:
        return None
