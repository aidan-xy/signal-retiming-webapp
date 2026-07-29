"""Pydantic response models. Output-only -- this API takes no writable input."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- corridors / intersections -------------------------------------------

class CorridorOut(ORMModel):
    id: int
    name: str
    borough: Optional[str]
    created_at: datetime.datetime


class IntersectionSummary(ORMModel):
    id: int
    tab_name: str
    name: str
    natural_order: int


class IntersectionOut(ORMModel):
    id: int
    corridor_id: int
    tab_name: str
    name: str
    natural_order: int
    major_crosswalk_ft: Optional[float]
    minor_crosswalk_ft: Optional[float]
    source_file: Optional[str]
    imported_at: datetime.datetime


# ---- channels / phase groups ----------------------------------------------

class ChannelOut(ORMModel):
    id: int
    channel_number: int
    kind: str
    movement_class: Optional[str]


class PhaseGroupOut(ORMModel):
    id: int
    group_index: int
    label: str


# ---- splits -----------------------------------------------------------------

class SplitIndicationOut(ORMModel):
    channel_number: int
    code: str


class SplitOut(ORMModel):
    id: int
    split_number: int
    position_in_group: int
    role: Optional[str]
    phase_group_label: str
    indications: list[SplitIndicationOut] = []


# ---- timing plans -----------------------------------------------------------

class PlanSplitOut(ORMModel):
    split_number: int
    role: Optional[str]
    phase_group_label: str
    duration_s: int


class TimingPlanOut(ORMModel):
    id: int
    plan_number: int
    cycle_length_s: int
    offset_s: int
    tod_description: Optional[str]


class TimingPlanDetail(TimingPlanOut):
    splits: list[PlanSplitOut] = []


# ---- v_plan_timing rows ------------------------------------------------------

class PlanTimingRow(BaseModel):
    corridor: str
    tab_name: str
    intersection: str
    natural_order: int
    plan_number: int
    cycle_length_s: int
    offset_s: int
    tod_description: Optional[str]
    phase_group: str
    split_number: int
    role: Optional[str]
    duration_s: int
