from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/intersections", tags=["intersections"])


def _get_intersection_or_404(db: Session, intersection_id: int) -> models.Intersection:
    inter = db.get(models.Intersection, intersection_id)
    if inter is None:
        raise HTTPException(status_code=404, detail="intersection not found")
    return inter


def _split_out(split: models.Split) -> schemas.SplitOut:
    return schemas.SplitOut(
        id=split.id,
        split_number=split.split_number,
        position_in_group=split.position_in_group,
        role=split.role,
        phase_group_label=split.phase_group.label,
        indications=[
            schemas.SplitIndicationOut(
                channel_number=ind.channel.channel_number, code=ind.code
            )
            for ind in split.indications
        ],
    )


def _plan_out(plan: models.TimingPlan) -> schemas.TimingPlanDetail:
    return schemas.TimingPlanDetail(
        id=plan.id,
        plan_number=plan.plan_number,
        cycle_length_s=plan.cycle_length_s,
        offset_s=plan.offset_s,
        tod_description=plan.tod_description,
        splits=[
            schemas.PlanSplitOut(
                split_number=ps.split.split_number,
                role=ps.split.role,
                phase_group_label=ps.split.phase_group.label,
                duration_s=ps.duration_s,
            )
            for ps in sorted(plan.plan_splits, key=lambda ps: ps.split.split_number)
        ],
    )


@router.get("/{intersection_id}", response_model=schemas.IntersectionOut)
def get_intersection(intersection_id: int, db: Session = Depends(get_db)):
    return _get_intersection_or_404(db, intersection_id)


@router.get("/{intersection_id}/channels", response_model=list[schemas.ChannelOut])
def list_channels(intersection_id: int, db: Session = Depends(get_db)):
    _get_intersection_or_404(db, intersection_id)
    stmt = (
        select(models.Channel)
        .where(models.Channel.intersection_id == intersection_id)
        .order_by(models.Channel.channel_number)
    )
    return db.scalars(stmt).all()


@router.get("/{intersection_id}/phase-groups", response_model=list[schemas.PhaseGroupOut])
def list_phase_groups(intersection_id: int, db: Session = Depends(get_db)):
    _get_intersection_or_404(db, intersection_id)
    stmt = (
        select(models.PhaseGroup)
        .where(models.PhaseGroup.intersection_id == intersection_id)
        .order_by(models.PhaseGroup.group_index)
    )
    return db.scalars(stmt).all()


@router.get("/{intersection_id}/splits", response_model=list[schemas.SplitOut])
def list_splits(intersection_id: int, db: Session = Depends(get_db)):
    _get_intersection_or_404(db, intersection_id)
    stmt = (
        select(models.Split)
        .where(models.Split.intersection_id == intersection_id)
        .options(
            selectinload(models.Split.phase_group),
            selectinload(models.Split.indications).selectinload(
                models.SplitIndication.channel
            ),
        )
        .order_by(models.Split.split_number)
    )
    return [_split_out(s) for s in db.scalars(stmt).all()]


@router.get("/{intersection_id}/timing-plans", response_model=list[schemas.TimingPlanOut])
def list_timing_plans(intersection_id: int, db: Session = Depends(get_db)):
    _get_intersection_or_404(db, intersection_id)
    stmt = (
        select(models.TimingPlan)
        .where(models.TimingPlan.intersection_id == intersection_id)
        .order_by(models.TimingPlan.plan_number)
    )
    return db.scalars(stmt).all()


@router.get(
    "/{intersection_id}/timing-plans/{plan_number}",
    response_model=schemas.TimingPlanDetail,
)
def get_timing_plan(intersection_id: int, plan_number: int, db: Session = Depends(get_db)):
    _get_intersection_or_404(db, intersection_id)
    stmt = (
        select(models.TimingPlan)
        .where(
            models.TimingPlan.intersection_id == intersection_id,
            models.TimingPlan.plan_number == plan_number,
        )
        .options(
            selectinload(models.TimingPlan.plan_splits)
            .selectinload(models.PlanSplit.split)
            .selectinload(models.Split.phase_group)
        )
    )
    plan = db.scalars(stmt).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="timing plan not found")
    return _plan_out(plan)
