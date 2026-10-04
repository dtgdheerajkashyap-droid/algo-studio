"""SQLite + SQLAlchemy session setup.

WAL journal mode is enabled for every connection:
  * Allows concurrent readers during a writer (eliminates "database is locked"
    from AI feedback writes happening alongside progress reads).
  * Dramatically reduces serialization contention on the submissions endpoint
    where an LLM feedback UPDATE races against other users' INSERTs.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

_connect_args: dict = {}
_is_sqlite = settings.database_url.startswith("sqlite:")
if _is_sqlite:
    _connect_args["check_same_thread"] = False  # SQLite + threaded FastAPI

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    # Managed Postgres drops idle connections; test before handing one out.
    pool_pre_ping=not _is_sqlite,
)


@event.listens_for(engine, "connect")
def _on_connect(dbapi_connection, connection_record):
    """Per-connection pragmas: WAL journal + busy timeout + foreign keys."""
    if not _is_sqlite:
        return
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


def _lock_down_sqlite_dir() -> None:
    """Keep the DB unreadable to the sandboxed submission user.

    Submitted code runs as RUNNER_UID; the DB directory must not be readable
    by it (password hashes, emails, refresh tokens). Platform volumes are
    often mounted 0755, so tighten it at startup.
    """
    if not _is_sqlite or settings.runner_uid is None or os.name != "posix":
        return
    db_path = settings.database_url.split("///", 1)[-1]
    if not db_path or db_path == ":memory:":
        return
    try:
        os.chmod(Path(db_path).resolve().parent, 0o700)
    except OSError:
        pass


_lock_down_sqlite_dir()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
