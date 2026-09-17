"""Shared fixtures: in-memory DB, TestClient, stubbed AI, auth helpers.

Run from backend/:  python -m pytest
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import ai
from app.config import settings
from app.db import Base, get_db
from app.main import app


@pytest.fixture()
def db_session_factory():
    """Fresh in-memory SQLite per test (StaticPool shares the one connection)."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    yield factory
    engine.dispose()


@pytest.fixture()
def client(db_session_factory, monkeypatch):
    """TestClient wired to the in-memory DB with AI feedback stubbed out."""

    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Stub out anything that talks to an external LLM, and force the app to
    # report "no API key configured" regardless of the developer's real .env.
    async def no_feedback(*args, **kwargs):
        return None

    async def no_tutor(*args, **kwargs):
        yield ai.NOT_CONFIGURED_MESSAGE
        return

    def none_configured():
        return {"configured": False, "provider": None, "model": None}

    monkeypatch.setattr(ai, "submission_feedback", no_feedback)
    monkeypatch.setattr(ai, "stream_tutor_reply", no_tutor)
    monkeypatch.setattr(ai, "configured_provider_info", none_configured)
    monkeypatch.setattr(ai, "is_configured", lambda: False)
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "openai_api_key", None)

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


REGISTER_BODY = {
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "password": "correct horse battery",
}


def csrf_headers(client: TestClient) -> dict:
    """Double-submit header matching the csrf_token cookie (empty pre-auth)."""
    token = client.cookies.get("csrf_token")
    return {"X-CSRF-Token": token} if token else {}


@pytest.fixture()
def auth_client(client):
    """Client with a registered, logged-in user (cookies + CSRF ready)."""
    res = client.post("/api/auth/register", json=REGISTER_BODY)
    assert res.status_code == 200, res.text
    return client
