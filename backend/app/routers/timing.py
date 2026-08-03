"""
Endpoint over v_plan_timing (defined in schema.sql).

The view has no primary key and isn't an entity in its own right -- it's a
flattened join for exactly this kind of query -- so it's queried with Core/text
rather than mapped as an ORM class.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db

router = APIRouter(prefix="/timing", tags=["timing"])

_BASE_QUERY = "SELECT * FROM v_plan_timing"


@router.get("", response_model=list[schemas.PlanTimingRow])
def query_plan_timing(
    corridor: Optional[str] = Query(None, description="exact corridor name"),
    tab_name: Optional[str] = Query(None, description="exact intersection tab_name"),
    scenario: Optional[str] = Query(
        None, pattern="^(existing|proposed)$",
        description="filter to one scenario; omit for both",
    ),
    plan_number: Optional[int] = Query(None),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    clauses: list[str] = []
    params: dict[str, object] = {"limit": limit, "offset": offset}

    if corridor is not None:
        clauses.append("corridor = :corridor")
        params["corridor"] = corridor
    if tab_name is not None:
        clauses.append("tab_name = :tab_name")
        params["tab_name"] = tab_name
    if scenario is not None:
        clauses.append("scenario = :scenario")
        params["scenario"] = scenario
    if plan_number is not None:
        clauses.append("plan_number = :plan_number")
        params["plan_number"] = plan_number

    sql = _BASE_QUERY
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY natural_order, scenario, plan_number, split_number LIMIT :limit OFFSET :offset"

    rows = db.execute(text(sql), params).mappings().all()
    return list(rows)
