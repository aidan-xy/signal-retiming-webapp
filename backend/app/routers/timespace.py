"""
Endpoint over v_timespace_movements (defined in schema.sql).

Same rationale as timing.py: the underlying views have no primary key and
aren't entities in their own right, so they're queried with Core/text rather
than mapped as ORM classes.

Powers the timespace map's two views:
  - table (Excel-like grid): the frontend fetches the whole day once per
    corridor + day_type (96 slots x every intersection in one response) and
    lays it out as a workbook-style grid.
  - map (single instant): the day input + 15-minute slider should index
    straight into that same already-fetched grid rather than re-querying on
    every drag. The slot_index/time filters below exist for callers that
    want a single instant resolved server-side instead (e.g. a shareable
    link to one point in time).

Each slot carries the plan's cycle length + offset (when its cycle starts)
plus, per Major/Minor movement, how much of that cycle is vehicle green
("split"), pedestrian WALK, flashing DON'T WALK, and yellow+all-red
clearance -- everything the map needs to draw progression bands, not just
mark which plan is active.

`scenario` defaults to 'existing'. 'proposed' is accepted too, but 404s
everywhere: the workbook has no numerically-resolvable Proposed TOD/movement
data at all (see extract.py's module docstring), so tod_slots/plan_movements
are only ever populated for scenario='existing'.
"""

from __future__ import annotations

import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/corridors", tags=["timespace"])

_BASE_QUERY = "SELECT * FROM v_timespace_movements"

SLOT_MINUTES = 15
SLOTS_PER_DAY = 24 * 60 // SLOT_MINUTES  # 96


def _time_to_slot_index(value: datetime.time) -> int:
    return (value.hour * 60 + value.minute) // SLOT_MINUTES


@router.get("/{corridor_id}/timespace", response_model=schemas.TimespaceGridOut)
def get_timespace(
    corridor_id: int,
    day_type: str = Query(..., pattern="^(weekday|weekend)$"),
    scenario: str = Query(
        "existing", pattern="^(existing|proposed)$",
        description=(
            "'existing' (as-built) or 'proposed'. Proposed TOD/movement data "
            "isn't populated in the workbook yet, so this scenario currently "
            "404s -- see extract.py -- until a retiming is entered and "
            "re-imported."
        ),
    ),
    slot_index: Optional[int] = Query(
        None, ge=0, le=SLOTS_PER_DAY - 1, description="0 = 00:00 ... 95 = 23:45"
    ),
    time: Optional[datetime.time] = Query(
        None,
        description="HH:MM, rounded down to its 15-minute slot -- alternative to slot_index",
    ),
    db: Session = Depends(get_db),
):
    corridor = db.get(models.Corridor, corridor_id)
    if corridor is None:
        raise HTTPException(status_code=404, detail="corridor not found")

    if slot_index is None and time is not None:
        slot_index = _time_to_slot_index(time)

    sql = _BASE_QUERY + " WHERE corridor = :corridor AND scenario = :scenario AND day_type = :day_type"
    params: dict[str, object] = {
        "corridor": corridor.name,
        "scenario": scenario,
        "day_type": day_type,
    }
    if slot_index is not None:
        sql += " AND slot_index = :slot_index"
        params["slot_index"] = slot_index
    sql += " ORDER BY natural_order, slot_index, movement_class"

    rows = db.execute(text(sql), params).mappings().all()

    by_intersection: dict[int, schemas.TimespaceIntersectionOut] = {}
    order: list[int] = []
    slots_by_key: dict[tuple[int, int], schemas.TimespaceSlotOut] = {}

    for row in rows:
        ikey = row["intersection_id"]
        if ikey not in by_intersection:
            by_intersection[ikey] = schemas.TimespaceIntersectionOut(
                intersection_id=row["intersection_id"],
                tab_name=row["tab_name"],
                name=row["intersection"],
                natural_order=row["natural_order"],
                slots=[],
            )
            order.append(ikey)

        skey = (ikey, row["slot_index"])
        slot = slots_by_key.get(skey)
        if slot is None:
            slot = schemas.TimespaceSlotOut(
                slot_index=row["slot_index"],
                slot_time=row["slot_time"].strftime("%H:%M"),
                plan_number=row["plan_number"],
                cycle_length_s=row["cycle_length_s"],
                offset_s=row["offset_s"],
                movements=[],
            )
            slots_by_key[skey] = slot
            by_intersection[ikey].slots.append(slot)

        slot.movements.append(
            schemas.TimespaceMovementOut(
                movement_class=row["movement_class"],
                split_s=row["split_s"],
                wk_s=row["wk_s"],
                fldw_s=row["fldw_s"],
                yellow_allred_s=row["yellow_allred_s"],
            )
        )

    if not by_intersection:
        raise HTTPException(
            status_code=404,
            detail=(
                "no timespace data for this corridor/scenario/day_type -- "
                "has import_workbook.py been run, and (for scenario=proposed) "
                "has a retiming actually been entered in the workbook yet?"
            ),
        )

    return schemas.TimespaceGridOut(
        corridor=corridor.name,
        scenario=scenario,
        day_type=day_type,
        intersections=[by_intersection[k] for k in order],
    )
