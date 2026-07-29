from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/corridors", tags=["corridors"])


@router.get("", response_model=list[schemas.CorridorOut])
def list_corridors(db: Session = Depends(get_db)):
    return db.scalars(select(models.Corridor).order_by(models.Corridor.name)).all()


@router.get("/{corridor_id}", response_model=schemas.CorridorOut)
def get_corridor(corridor_id: int, db: Session = Depends(get_db)):
    corridor = db.get(models.Corridor, corridor_id)
    if corridor is None:
        raise HTTPException(status_code=404, detail="corridor not found")
    return corridor


@router.get("/{corridor_id}/intersections", response_model=list[schemas.IntersectionSummary])
def list_corridor_intersections(corridor_id: int, db: Session = Depends(get_db)):
    if db.get(models.Corridor, corridor_id) is None:
        raise HTTPException(status_code=404, detail="corridor not found")
    stmt = (
        select(models.Intersection)
        .where(models.Intersection.corridor_id == corridor_id)
        .order_by(models.Intersection.natural_order)
    )
    return db.scalars(stmt).all()
