"""Database engine and session.

SQLite by default so the backend runs with zero infrastructure. Point
DATABASE_URL at Postgres (e.g. postgresql+psycopg://…) and nothing else in the
codebase changes — that is the whole point of keeping SQLAlchemy in the middle.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "sqlite:///./gridcards.db"
)

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    # SQLite only: the dev server serves requests on threads.
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables. Import models first so they register on Base."""
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
