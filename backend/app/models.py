"""
ORM mapping onto the tables defined in schema.sql.

This mirrors the DDL exactly -- it does not create or alter anything
(no create_all() is ever called; see database.py). The four Postgres enum
types (channel_kind, street_class, day_type, scenario) are declared with
create_type=False since schema.sql already owns them.
"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy import Enum as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

ChannelKind = PgEnum("vehicle", "pedestrian", name="channel_kind", create_type=False)
StreetClass = PgEnum("Major", "Minor", name="street_class", create_type=False)
DayType = PgEnum("weekday", "weekend", name="day_type", create_type=False)
Scenario = PgEnum("existing", "proposed", name="scenario", create_type=False)


class Corridor(Base):
    __tablename__ = "corridors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    city: Mapped[Optional[str]]
    state: Mapped[Optional[str]]
    lat: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    lon: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    created_at: Mapped[datetime.datetime]

    intersections: Mapped[list["Intersection"]] = relationship(
        back_populates="corridor", order_by="Intersection.natural_order"
    )


class Intersection(Base):
    __tablename__ = "intersections"
    __table_args__ = (
        UniqueConstraint("corridor_id", "tab_name"),
        UniqueConstraint("corridor_id", "natural_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    corridor_id: Mapped[int] = mapped_column(ForeignKey("corridors.id", ondelete="CASCADE"))
    tab_name: Mapped[str]
    name: Mapped[str]
    natural_order: Mapped[int]
    lat: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    lon: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    major_crosswalk_ft: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    minor_crosswalk_ft: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    source_file: Mapped[Optional[str]]
    imported_at: Mapped[datetime.datetime]

    corridor: Mapped["Corridor"] = relationship(back_populates="intersections")
    channels: Mapped[list["Channel"]] = relationship(
        back_populates="intersection", order_by="Channel.channel_number"
    )
    phase_groups: Mapped[list["PhaseGroup"]] = relationship(
        back_populates="intersection", order_by="PhaseGroup.group_index"
    )
    splits: Mapped[list["Split"]] = relationship(
        back_populates="intersection", order_by="Split.split_number"
    )
    timing_plans: Mapped[list["TimingPlan"]] = relationship(
        back_populates="intersection", order_by="TimingPlan.plan_number"
    )
    tod_slots: Mapped[list["TodSlot"]] = relationship(
        back_populates="intersection", order_by="TodSlot.slot_index"
    )


class Channel(Base):
    __tablename__ = "channels"
    __table_args__ = (UniqueConstraint("intersection_id", "channel_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    intersection_id: Mapped[int] = mapped_column(
        ForeignKey("intersections.id", ondelete="CASCADE")
    )
    channel_number: Mapped[int]
    kind: Mapped[str] = mapped_column(ChannelKind)
    movement_class: Mapped[Optional[str]] = mapped_column(StreetClass)

    intersection: Mapped["Intersection"] = relationship(back_populates="channels")


class PhaseGroup(Base):
    __tablename__ = "phase_groups"
    __table_args__ = (UniqueConstraint("intersection_id", "group_index"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    intersection_id: Mapped[int] = mapped_column(
        ForeignKey("intersections.id", ondelete="CASCADE")
    )
    group_index: Mapped[int]
    label: Mapped[str]

    intersection: Mapped["Intersection"] = relationship(back_populates="phase_groups")
    splits: Mapped[list["Split"]] = relationship(
        back_populates="phase_group", order_by="Split.position_in_group"
    )


class Split(Base):
    __tablename__ = "splits"
    __table_args__ = (UniqueConstraint("intersection_id", "split_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    intersection_id: Mapped[int] = mapped_column(
        ForeignKey("intersections.id", ondelete="CASCADE")
    )
    phase_group_id: Mapped[int] = mapped_column(
        ForeignKey("phase_groups.id", ondelete="CASCADE")
    )
    split_number: Mapped[int]
    position_in_group: Mapped[int]
    role: Mapped[Optional[str]]

    intersection: Mapped["Intersection"] = relationship(back_populates="splits")
    phase_group: Mapped["PhaseGroup"] = relationship(back_populates="splits")
    indications: Mapped[list["SplitIndication"]] = relationship(back_populates="split")
    plan_splits: Mapped[list["PlanSplit"]] = relationship(back_populates="split")


class SplitIndication(Base):
    __tablename__ = "split_indications"
    __table_args__ = (UniqueConstraint("split_id", "channel_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    split_id: Mapped[int] = mapped_column(ForeignKey("splits.id", ondelete="CASCADE"))
    channel_id: Mapped[int] = mapped_column(ForeignKey("channels.id", ondelete="CASCADE"))
    code: Mapped[str]

    split: Mapped["Split"] = relationship(back_populates="indications")
    channel: Mapped["Channel"] = relationship()


class TimingPlan(Base):
    __tablename__ = "timing_plans"
    __table_args__ = (
        UniqueConstraint("intersection_id", "scenario", "plan_number"),
        CheckConstraint("offset_s < cycle_length_s"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    intersection_id: Mapped[int] = mapped_column(
        ForeignKey("intersections.id", ondelete="CASCADE")
    )
    scenario: Mapped[str] = mapped_column(Scenario, default="existing")
    plan_number: Mapped[int]
    cycle_length_s: Mapped[int]
    offset_s: Mapped[int]
    tod_description: Mapped[Optional[str]]

    intersection: Mapped["Intersection"] = relationship(back_populates="timing_plans")
    plan_splits: Mapped[list["PlanSplit"]] = relationship(back_populates="timing_plan")
    plan_movements: Mapped[list["PlanMovement"]] = relationship(back_populates="timing_plan")


class PlanSplit(Base):
    __tablename__ = "plan_splits"
    __table_args__ = (UniqueConstraint("timing_plan_id", "split_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    timing_plan_id: Mapped[int] = mapped_column(
        ForeignKey("timing_plans.id", ondelete="CASCADE")
    )
    split_id: Mapped[int] = mapped_column(ForeignKey("splits.id", ondelete="CASCADE"))
    duration_s: Mapped[int]

    timing_plan: Mapped["TimingPlan"] = relationship(back_populates="plan_splits")
    split: Mapped["Split"] = relationship(back_populates="plan_splits")


class TodSlot(Base):
    """
    Which plan is active at an intersection for a given 15-minute slot of the
    day (slot_index 0 = 00:00 ... 95 = 23:45), split by weekday/weekend and by
    scenario.

    Linked to TimingPlan via the composite (intersection_id, scenario,
    plan_number) FK rather than timing_plan_id directly, so a slot can never
    reference another intersection's (or another scenario's) plan by mistake
    -- see schema.sql. In practice only scenario='existing' rows exist today;
    see extract.py for why 'proposed' has nothing resolvable yet.
    """

    __tablename__ = "tod_slots"
    __table_args__ = (
        UniqueConstraint("intersection_id", "scenario", "day_type", "slot_index"),
        ForeignKeyConstraint(
            ["intersection_id", "scenario", "plan_number"],
            ["timing_plans.intersection_id", "timing_plans.scenario",
             "timing_plans.plan_number"],
            ondelete="CASCADE",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    intersection_id: Mapped[int] = mapped_column(
        ForeignKey("intersections.id", ondelete="CASCADE")
    )
    scenario: Mapped[str] = mapped_column(Scenario, default="existing")
    day_type: Mapped[str] = mapped_column(DayType)
    slot_index: Mapped[int]
    plan_number: Mapped[int]

    intersection: Mapped["Intersection"] = relationship(back_populates="tod_slots")


class PlanMovement(Base):
    """
    Major/Minor approach-level summary for one plan: vehicle green ("Split"),
    pedestrian WALK, flashing DON'T WALK, and combined yellow+all-red
    clearance. Read directly from the workbook's own precomputed summary
    rather than derived from splits/channels -- see schema.sql.
    """

    __tablename__ = "plan_movements"
    __table_args__ = (UniqueConstraint("timing_plan_id", "movement_class"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    timing_plan_id: Mapped[int] = mapped_column(
        ForeignKey("timing_plans.id", ondelete="CASCADE")
    )
    movement_class: Mapped[str] = mapped_column(StreetClass)
    split_s: Mapped[int]
    wk_s: Mapped[int]
    fldw_s: Mapped[int]
    yellow_allred_s: Mapped[int]

    timing_plan: Mapped["TimingPlan"] = relationship(back_populates="plan_movements")
