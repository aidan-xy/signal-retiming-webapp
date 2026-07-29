"""
Engine/session setup.

Read-only API: no create_all(), no migrations here -- schema.sql is the single
source of truth for DDL. Point this at a role with SELECT-only grants; the API
never writes.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("SIGNALS_DSN") or os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "Set SIGNALS_DSN (or DATABASE_URL) to a postgresql:// DSN, e.g.\n"
        "  export SIGNALS_DSN='postgresql://signals_ro@localhost/signals'"
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
