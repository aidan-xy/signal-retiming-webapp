"""
Thin read API over the signal-timing database.

Scope matches the database: existing ("as-built") and proposed timings, for
whatever corridors have been imported. Proposed data reflects the workbook's
own final-proposed staging block (see extract.py), so it's real regardless
of whether a given plan happens to match Existing. No write endpoints --
loading data is import_workbook.py's job, not this API's.

Run:
    export SIGNALS_DSN="postgresql://username:password@localhost/signals"
    uvicorn app.main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import text

from .database import engine
from .routers import corridors, intersections, timespace, timing

app = FastAPI(
    title="Signal Timing API",
    description="Read-only API over as-built and proposed NYCDOT signal timing data.",
    version="0.1.0",
)

_allow_origins = os.environ.get("CORS_ALLOW_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_origins == "*" else _allow_origins.split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(corridors.router)
app.include_router(intersections.router)
app.include_router(timing.router)
app.include_router(timespace.router)


@app.get("/health", tags=["meta"])
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
