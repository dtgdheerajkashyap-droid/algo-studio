"""SQLite + SQLAlchemy session setup.

WAL journal mode is enabled for every connection:
  * Allows concurrent readers during a writer (eliminates "database is locked"
    from AI feedback writes happening alongside progress reads).
  * Dramatically reduces serialization contention on the submissions endpoint
    where an LLM feedback UPDATE races against other users' INSERTs.
"""

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


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
