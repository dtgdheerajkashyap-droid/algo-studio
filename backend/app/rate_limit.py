"""Lightweight in-memory rate limiters for endpoints that face abuse risk.

Design goals:
  * Zero extra dependencies (no Redis required for single-container deploy).
  * Per-key sliding windows based on monotonic clock (not wall-clock, so NTP
    jumps can't drop or grant extra tokens).
  * Stale entries reaped lazily on the hot path (no background thread).

If this service ever scales to multi-worker or multi-process uvicorn, swap
this out for a shared store (Redis / pg advisory locks). For the default
`uvicorn --workers 1` deployment (including the Dockerfile) it is exact.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass


@dataclass
class RateLimit:
    """A per-window quota — the limiter keeps a sequence of these per key."""

    window_s: int
    max_events: int


class SlidingWindowLimiter:
    """Classic sliding-window count limiter. Memory-only; safe for single process.

    Usage:
        limiter = SlidingWindowLimiter({"u/p/login": RateLimit(60, 10)})
        if not limiter.try_consume("u/p/login", f"{client_ip}"):
            raise HTTPException(429)
    """

    def __init__(self, policies: dict[str, RateLimit], reap_every: int = 64):
        self._policies = dict(policies)
        self._buckets: dict[str, dict[str, deque[float]]] = defaultdict(dict)
        self._reap_every = max(1, reap_every)
        self._ops = 0

    def try_consume(self, policy: str, key: str) -> bool:
        """Return True if the caller stays within quota; False = throttled."""
        cfg = self._policies.get(policy)
        if cfg is None:
            raise KeyError(f"Unknown rate limit policy: {policy}")
        now = time.monotonic()
        bucket = self._buckets[policy]
        dq = bucket.get(key)
        if dq is None:
            dq = deque()
            bucket[key] = dq
        # Drop events older than the window tail.
        cutoff = now - cfg.window_s
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= cfg.max_events:
            return False
        dq.append(now)
        # Lazy reap every N operations to avoid unbounded growth from key churn.
        self._ops += 1
        if self._ops % self._reap_every == 0:
            self._reap(now)
        return True

    def remaining(self, policy: str, key: str) -> int:
        """Non-mutating inspector — how many events can still fire this window."""
        cfg = self._policies[policy]
        now = time.monotonic()
        dq = self._buckets.get(policy, {}).get(key)
        if not dq:
            return cfg.max_events
        cutoff = now - cfg.window_s
        active = sum(1 for t in dq if t >= cutoff)
        return max(0, cfg.max_events - active)

    def _reap(self, now: float) -> None:
        for policy, cfg in self._policies.items():
            bucket = self._buckets.get(policy)
            if not bucket:
                continue
            cutoff = now - cfg.window_s
            stale_keys = [k for k, dq in bucket.items() if not dq or dq[-1] < cutoff]
            for k in stale_keys:
                del bucket[k]


# ---------------------------------------------------------------------------
# Site-wide singleton — import and call try_consume.
#
# Policies:
#   auth.login       — per IP:    10 attempts / 60s  (brute force barrier)
#   auth.register    — per IP:    5  accounts / 5 min (signup spam)
#   submit.perUser   — per user:  12 submissions / 60s  (queue + cpu protection)
#   submit.perIP     — per IP:    30 submissions / 60s  (guest/anonymous cap)
#   tutor.perUser    — per user:  30 chat msgs / 60s  (LLM spend guard)
# ---------------------------------------------------------------------------

_POLICIES: dict[str, RateLimit] = {
    "auth.login": RateLimit(window_s=60, max_events=10),
    "auth.register": RateLimit(window_s=300, max_events=5),
    "submit.perUser": RateLimit(window_s=60, max_events=12),
    "submit.perIP": RateLimit(window_s=60, max_events=30),
    "tutor.perUser": RateLimit(window_s=60, max_events=30),
}

limiter = SlidingWindowLimiter(_POLICIES)


def client_ip(request) -> str:
    """Best-effort client IP, honoring X-Forwarded-For when running behind a proxy.

    We take the *leftmost* non-empty entry of the standard concatenated list,
    and fall back to the direct peer IP. Never trust the header for security
    decisions (the header can be spoofed by a direct caller) — usage here is
    for rate limiting keys only, which degrades gracefully when spoofed.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        for candidate in forwarded.split(","):
            candidate = candidate.strip()
            if candidate:
                return candidate
    peer = getattr(request, "client", None)
    if peer is not None:
        return peer.host or "unknown"
    return "unknown"
