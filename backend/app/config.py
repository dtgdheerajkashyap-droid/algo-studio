"""App configuration — reads backend/.env (all keys optional in dev)."""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    # "development" (default) or "production" — production turns on secure
    # cookies and refuses to run with the dev JWT secret.
    env: str = os.environ.get("APP_ENV", "development")

    # Dev fallback is ≥32 bytes to satisfy RFC 7518 HS256 key-length guidance;
    # production MUST still set a real JWT_SECRET.
    jwt_secret: str = os.environ.get(
        "JWT_SECRET", "dev-secret-change-me-0123456789abcdef"
    )
    database_url: str = os.environ.get(
        "DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'app.db'}"
    )

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


settings = Settings()
settings.validate_production()
