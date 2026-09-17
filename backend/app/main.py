"""Algorithm Studio backend — FastAPI app.

Dev:   python -m uvicorn app.main:app --port 8000 --reload   (from backend/)
       Frontend runs separately (vite dev, proxies /api → :8000).
Prod:  the app also serves the built frontend from STATIC_DIR (frontend/dist),
       so one container serves everything.
"""

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from . import ai
from .config import settings
from .db import Base, engine
from .routers import auth, progress, submissions, tutor
from .security import check_csrf


def _migrate():
    """Lightweight idempotent migrations for columns added after v1.

    Base.metadata.create_all only creates missing tables; it never adds
    columns to existing tables. We run the missing ALTER TABLEs by hand so
    existing SQLite installs keep working without Alembic overhead.
    """
    inspector = inspect(engine)
    with engine.begin() as conn:
        submissions_cols = {c["name"] for c in inspector.get_columns("submissions")}
        if "updated_at" not in submissions_cols:
            conn.execute(text(
                "ALTER TABLE submissions ADD COLUMN updated_at DATETIME"
            ))


Base.metadata.create_all(bind=engine)
_migrate()

app = FastAPI(
    title="Algorithm Studio API",
    dependencies=[Depends(check_csrf)],
)

# Vite proxies /api → localhost:8000 (same origin in the browser), so CORS only
# matters if the frontend ever talks to :8000 directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vite's dev proxy forwards /api/* verbatim (no path rewrite), so everything
# is mounted under /api.
api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(submissions.router)
api.include_router(progress.router)
api.include_router(tutor.router)
app.include_router(api)


@app.get("/health")
def health():
    return {"ok": True, **ai.configured_provider_info()}


# ------------------------------------------------------------- SPA (production)
# When the built frontend exists, serve it: static assets under /assets, and
# index.html for every other non-API path (client-side routing).
_index = settings.static_dir / "index.html"
if _index.is_file():
    app.mount(
        "/assets",
        StaticFiles(directory=settings.static_dir / "assets"),
        name="assets",
    )

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        candidate = settings.static_dir / path
        # Serve real top-level files (favicon, robots.txt…); guard traversal.
        if (
            path
            and "/" not in path
            and ".." not in path
            and candidate.is_file()
        ):
            return FileResponse(candidate)
        return FileResponse(_index)
