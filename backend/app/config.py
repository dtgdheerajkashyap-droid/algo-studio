"""App configuration — reads backend/.env (all keys optional in dev)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

log = logging.getLogger("algostudio")


def _normalize_db_url(url: str) -> str:
    """Accept the bare postgres:// URLs that Railway/Render/Heroku hand out.

    SQLAlchemy 2 dropped the "postgres" alias and defaults to psycopg2; we ship
    psycopg 3, so point both spellings at the psycopg driver explicitly.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def _on_mounted_volume(sqlite_url: str) -> bool:
    """True if the SQLite file's directory is (inside) a mount point — i.e. a
    platform volume that survives redeploys, not the container's own layer."""
    path = Path(sqlite_url.split("///", 1)[-1]).resolve().parent
    for d in (path, *path.parents):
        if d == d.parent:  # reached filesystem root
            return False
        if os.path.ismount(d):
            return True
    return False


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


class Settings:
    # "development" (default) or "production" — production turns on secure
    # cookies and refuses to run with the dev JWT secret.
    env: str = os.environ.get("APP_ENV", "development")

    # Dev fallback is ≥32 bytes to satisfy RFC 7518 HS256 key-length guidance;
    # production MUST still set a real JWT_SECRET.
    jwt_secret: str = os.environ.get(
        "JWT_SECRET", "dev-secret-change-me-0123456789abcdef"
    )
    database_url: str = _normalize_db_url(
        os.environ.get("DATABASE_URL") or f"sqlite:///{BACKEND_DIR / 'app.db'}"
    )

    # How many reverse proxies sit in front of the app and append to
    # X-Forwarded-For. Railway's edge = 1; Vercel rewrite -> Railway = 2.
    # The client IP is taken that many entries from the right, so callers
    # can't spoof it by sending their own X-Forwarded-For header.
    trusted_proxy_hops: int = _int_env("TRUSTED_PROXY_HOPS", 1)

    # Max code submissions executing at once (each may use ~256 MB).
    max_concurrent_runs: int = _int_env("MAX_CONCURRENT_RUNS", 2)

    # Unprivileged uid/gid that submitted code runs as. Set by the Docker
    # image; when unset (local dev) code runs as the server's own user.
    runner_uid: int | None = int(os.environ["RUNNER_UID"]) if os.environ.get("RUNNER_UID") else None
    runner_gid: int | None = int(os.environ["RUNNER_GID"]) if os.environ.get("RUNNER_GID") else None

    # Directory of built frontend assets (vite build output). When it exists,
    # the backend serves the SPA itself — single-container production deploy.
    static_dir: Path = Path(
        os.environ.get("STATIC_DIR", BACKEND_DIR.parent / "frontend" / "dist")
    )

    anthropic_api_key: str | None = os.environ.get("ANTHROPIC_API_KEY") or None
    openai_api_key: str | None = os.environ.get("OPENAI_API_KEY") or None
    groq_api_key: str | None = os.environ.get("GROQ_API_KEY") or None
    openrouter_api_key: str | None = os.environ.get("OPENROUTER_API_KEY") or None
    gemini_api_key: str | None = os.environ.get("GEMINI_API_KEY") or None
    ollama_base_url: str | None = os.environ.get("OLLAMA_BASE_URL") or None

    google_client_id: str | None = os.environ.get("GOOGLE_CLIENT_ID") or None
    google_client_secret: str | None = os.environ.get("GOOGLE_CLIENT_SECRET") or None
    google_redirect_uri: str = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://localhost:5173/api/auth/google/callback"
    )
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    access_token_minutes: int = 30
    refresh_token_days: int = 14

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    def validate_production(self) -> None:
        """Refuse obviously-unsafe production configs at startup."""
        if not self.is_production:
            return
        if self.jwt_secret.startswith("dev-secret-change-me"):
            raise RuntimeError(
                "APP_ENV=production requires a real JWT_SECRET "
                "(set a long random string in the environment)."
            )
        if len(self.jwt_secret) < 32:
            raise RuntimeError("JWT_SECRET must be at least 32 characters long.")
        if self.database_url.startswith("sqlite:") and not _on_mounted_volume(self.database_url):
            log.warning(
                "APP_ENV=production with SQLite at %s — this file is wiped on every "
                "redeploy unless it sits on a persistent volume. Use Postgres "
                "(DATABASE_URL=postgres://...) or mount a volume at /data.",
                self.database_url,
            )


settings = Settings()
settings.validate_production()
