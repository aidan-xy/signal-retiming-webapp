-- =============================================================================
-- Signal timing database -- existing ("as-built") and proposed timings.
--
-- Source of truth: the per-intersection tabs of the NYCDOT corridor comparison
-- workbook. The raw IQL controller report remains OUT OF SCOPE for this schema.
--
-- Proposed timings: read from each tab's final-proposed staging block (the
-- "Copy and paste into the new signal timing sheet" note), not the in-place
-- "Proposed" block next to Existing -- see extract.py's module docstring.
-- Its cycle/offset/split-duration cells are real retiming decisions, so a
-- `scenario = 'proposed'` row that equals its `scenario = 'existing'`
-- counterpart reflects a deliberate "no change here" decision, not an
-- unfilled placeholder.
--
-- Proposed's tod_slots/plan_movements come from a different part of the
-- workbook than Existing's: there's no per-plan movement-summary block for
-- Proposed (the 'MajorG' anchor block exists only once per tab, for
-- Existing) and its Weekday/WeekendProposedPlan TOD columns resolve to a
-- code (e.g. "AP"), not a plan number directly -- see extract.py's module
-- docstring for how both are derived from the workbook's per-slot resolved
-- table instead. Populated per intersection when that table could be read;
-- a tab where it couldn't still keeps its proposed timing_plans rows.
--
-- Target: PostgreSQL 13+
-- =============================================================================

BEGIN;

CREATE TABLE corridors (
    id              serial PRIMARY KEY,
    name            text NOT NULL UNIQUE,           -- e.g. 'Linden Blvd'
    city            text,                           -- e.g. 'Brooklyn'
    state           text,                           -- e.g. 'NY'
    -- Map center for the corridor. Nullable: a corridor may be imported before
    -- its geometry is known. In practice derived from the mean of its
    -- intersections' coordinates (see the location seed SQL).
    lat             numeric(9,6),
    lon             numeric(9,6),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Intersections
--
-- tab_name is the stable natural key: it is what the workbook, the IQL Tab Setup
-- data bank, and the VBA macros all key on, so it is the only identifier that
-- reliably survives a re-export. Keep it even though it is a spreadsheet
-- artifact -- it is what lets a re-import match rows instead of duplicating them.
-- -----------------------------------------------------------------------------
CREATE TABLE intersections (
    id                    serial PRIMARY KEY,
    corridor_id           integer NOT NULL REFERENCES corridors(id) ON DELETE CASCADE,
    tab_name              text NOT NULL,            -- 'Flatbush_Ave'
    name                  text NOT NULL,            -- 'Flatbush Ave'
    natural_order         integer NOT NULL,         -- spatial order along corridor (W->E)
    -- Signal location. Nullable: coordinates come from an external source (the
    -- NYCDOT signal KMZ), not the timing workbook, so an intersection can be
    -- imported before its lat/lon is known. When present, the frontend places
    -- the map marker here directly instead of name-matching or interpolating.
    lat                   numeric(9,6),
    lon                   numeric(9,6),
    major_crosswalk_ft    numeric(6,2),             -- crosswalk length across the major street
    minor_crosswalk_ft    numeric(6,2),
    source_file           text,                     -- provenance: workbook filename
    imported_at           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (corridor_id, tab_name),
    UNIQUE (corridor_id, natural_order)
);

-- -----------------------------------------------------------------------------
-- Channels: the controller load-switch channels (row 9 of each tab).
-- Each carries either a vehicle movement or a pedestrian movement, classified
-- as serving the Major or Minor street. Channel count varies by intersection
-- (8 at most locations, 12 at Kings Hwy).
-- -----------------------------------------------------------------------------
CREATE TYPE channel_kind AS ENUM ('vehicle', 'pedestrian');
CREATE TYPE street_class AS ENUM ('Major', 'Minor');

CREATE TABLE channels (
    id                serial PRIMARY KEY,
    intersection_id   integer NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    channel_number    integer NOT NULL CHECK (channel_number > 0),
    kind              channel_kind NOT NULL,
    movement_class    street_class,                 -- NULL where the tab leaves it unassigned
    UNIQUE (intersection_id, channel_number)
);

-- -----------------------------------------------------------------------------
-- Phase groups: 'Phase A'..'Phase E'. Each occupies a fixed 10-slot band of
-- split numbers in the workbook; only the used slots are stored here.
-- -----------------------------------------------------------------------------
CREATE TABLE phase_groups (
    id                 serial PRIMARY KEY,
    intersection_id    integer NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    group_index        integer NOT NULL CHECK (group_index > 0),   -- 1 = Phase A
    label              text NOT NULL,                              -- 'Phase A'
    UNIQUE (intersection_id, group_index)
);

-- -----------------------------------------------------------------------------
-- Splits: the ordered interval sequence. split_number is the running counter in
-- column A and is what the controller itself calls "split N".
-- role is the workbook's label: PHASE A / SPARE / TSP EXT / VEH CL / PED CL.
-- -----------------------------------------------------------------------------
CREATE TABLE splits (
    id                serial PRIMARY KEY,
    intersection_id   integer NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    phase_group_id    integer NOT NULL REFERENCES phase_groups(id) ON DELETE CASCADE,
    split_number      integer NOT NULL CHECK (split_number > 0),
    position_in_group integer NOT NULL CHECK (position_in_group > 0),
    role              text,                         -- 'PHASE A', 'VEH CL', 'PED CL', ...
    UNIQUE (intersection_id, split_number)
);

-- -----------------------------------------------------------------------------
-- Per-split, per-channel signal indication: G, Y, A, R, WK, DW, FLDW, 'G/<-G', ...
-- This is the phasing diagram, normalized.
-- -----------------------------------------------------------------------------
CREATE TABLE split_indications (
    id           serial PRIMARY KEY,
    split_id     integer NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
    channel_id   integer NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    code         text NOT NULL,
    UNIQUE (split_id, channel_id)
);

-- -----------------------------------------------------------------------------
-- Scenario: 'existing' (as-built) vs 'proposed' (the workbook's Proposed
-- block). Plan numbers are only unique within a scenario -- Existing plan 1
-- and Proposed plan 1 are different rows -- so scenario is part of the key
-- everywhere plan_number is.
-- -----------------------------------------------------------------------------
CREATE TYPE scenario AS ENUM ('existing', 'proposed');

-- -----------------------------------------------------------------------------
-- Timing plans: one per time-of-day pattern at an intersection, per scenario.
-- tod_description is kept as the raw workbook string ('MON-FRI 05:00-10:15');
-- it is provenance/display text only -- tod_slots (below) is the queryable
-- day/time -> plan resolution, since several tod_description cells pack
-- multiple disjoint windows into one string.
-- -----------------------------------------------------------------------------
CREATE TABLE timing_plans (
    id                serial PRIMARY KEY,
    intersection_id   integer NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    scenario          scenario NOT NULL DEFAULT 'existing',
    plan_number       integer NOT NULL CHECK (plan_number > 0),
    cycle_length_s    integer NOT NULL CHECK (cycle_length_s > 0),
    offset_s          integer NOT NULL CHECK (offset_s >= 0),
    tod_description   text,
    UNIQUE (intersection_id, scenario, plan_number),
    CHECK (offset_s < cycle_length_s)
);

CREATE TABLE plan_splits (
    id               serial PRIMARY KEY,
    timing_plan_id   integer NOT NULL REFERENCES timing_plans(id) ON DELETE CASCADE,
    split_id         integer NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
    duration_s       integer NOT NULL CHECK (duration_s >= 0),
    UNIQUE (timing_plan_id, split_id)
);

-- -----------------------------------------------------------------------------
-- Approach-level movement summary, per plan: the Major and Minor streets'
-- vehicle green ("Split"), pedestrian WALK, flashing DON'T WALK, and combined
-- yellow+all-red clearance -- the numbers the workbook's own Time_SpaceMap
-- tab draws progression bands from.
--
-- Deliberately not derived from splits/split_indications by summing
-- duration_s per channel.movement_class: several intersections (e.g.
-- Kings_Hwy, E_58_St) have more than one vehicle channel sharing the same
-- movement_class (a through + a protected-left channel both tagged 'Major'),
-- so a generic per-channel sum would double-count. These values are read
-- directly from the workbook's own precomputed summary instead -- see
-- extract.py's _read_plan_movements.
-- -----------------------------------------------------------------------------
CREATE TABLE plan_movements (
    id                serial PRIMARY KEY,
    timing_plan_id    integer NOT NULL REFERENCES timing_plans(id) ON DELETE CASCADE,
    movement_class    street_class NOT NULL,
    split_s           integer NOT NULL CHECK (split_s >= 0),
    wk_s              integer NOT NULL CHECK (wk_s >= 0),
    fldw_s            integer NOT NULL CHECK (fldw_s >= 0),
    yellow_allred_s   integer NOT NULL CHECK (yellow_allred_s >= 0),
    UNIQUE (timing_plan_id, movement_class)
);

CREATE INDEX ix_intersections_corridor    ON intersections (corridor_id, natural_order);
CREATE INDEX ix_splits_intersection       ON splits (intersection_id, split_number);
CREATE INDEX ix_plan_splits_plan          ON plan_splits (timing_plan_id);
CREATE INDEX ix_plan_movements_plan       ON plan_movements (timing_plan_id);
CREATE INDEX ix_indications_split         ON split_indications (split_id);
CREATE INDEX ix_timing_plans_intersection ON timing_plans (intersection_id);

-- -----------------------------------------------------------------------------
-- Time-of-day slots: which plan is active, per intersection, per 15-minute
-- slot of the day (0 = 00:00 ... 95 = 23:45), split out by weekday/weekend.
--
-- Source of truth: each intersection tab's own precomputed helper columns
-- (WeekdayExistingPlan / WeekendExistingPlan, and their Proposed
-- counterparts, 96 rows each) that the workbook's Time_SpaceMap tab already
-- reads from -- imported directly rather than re-parsed out of
-- tod_description, which is free text and not reliably machine-parseable
-- (see comment on timing_plans above).
--
-- scenario is carried here too (not just plan_number) since Existing plan 1
-- and Proposed plan 1 are different timing_plans rows. Proposed's columns
-- resolve to a code (e.g. "AP"), not a plan number directly -- see
-- extract.py's module docstring -- and a tab whose per-slot table couldn't
-- be resolved that way simply has no scenario = 'proposed' rows here, while
-- keeping its proposed timing_plans/plan_splits rows.
--
-- The composite FK against timing_plans' own (intersection_id, scenario,
-- plan_number) unique constraint guarantees a slot can never point at
-- another intersection's (or another scenario's) plan.
-- -----------------------------------------------------------------------------
CREATE TYPE day_type AS ENUM ('weekday', 'weekend');

CREATE TABLE tod_slots (
    id                serial PRIMARY KEY,
    intersection_id   integer NOT NULL REFERENCES intersections(id) ON DELETE CASCADE,
    scenario          scenario NOT NULL DEFAULT 'existing',
    day_type          day_type NOT NULL,
    slot_index         smallint NOT NULL CHECK (slot_index BETWEEN 0 AND 95),
    plan_number        integer NOT NULL,
    UNIQUE (intersection_id, scenario, day_type, slot_index),
    FOREIGN KEY (intersection_id, scenario, plan_number)
        REFERENCES timing_plans (intersection_id, scenario, plan_number) ON DELETE CASCADE
);

CREATE INDEX ix_tod_slots_intersection ON tod_slots (intersection_id, scenario, day_type, slot_index);

-- -----------------------------------------------------------------------------
-- Convenience view: split durations with everything a UI needs to draw a ring
-- diagram or a timing table, without a five-way join in application code.
-- -----------------------------------------------------------------------------
CREATE VIEW v_plan_timing AS
SELECT c.name              AS corridor,
       i.tab_name,
       i.name              AS intersection,
       i.natural_order,
       tp.scenario,
       tp.plan_number,
       tp.cycle_length_s,
       tp.offset_s,
       tp.tod_description,
       pg.label            AS phase_group,
       s.split_number,
       s.role,
       ps.duration_s
FROM plan_splits  ps
JOIN timing_plans tp ON tp.id = ps.timing_plan_id
JOIN splits       s  ON s.id  = ps.split_id
JOIN phase_groups pg ON pg.id = s.phase_group_id
JOIN intersections i ON i.id  = tp.intersection_id
JOIN corridors    c  ON c.id  = i.corridor_id;

-- -----------------------------------------------------------------------------
-- Convenience view: the timespace map's day/time -> active-plan grid.
-- One row per (intersection, day_type, slot_index), 15-minute resolution,
-- carrying the active plan's cycle length and offset so the frontend can
-- compute progression bands without a second round trip per slot.
-- -----------------------------------------------------------------------------
CREATE VIEW v_timespace AS
SELECT i.id                                            AS intersection_id,
       c.name                                          AS corridor,
       i.tab_name,
       i.name                                          AS intersection,
       i.natural_order,
       ts.scenario,
       ts.day_type,
       ts.slot_index,
       (ts.slot_index * interval '15 minutes')::time   AS slot_time,
       tp.plan_number,
       tp.cycle_length_s,
       tp.offset_s,
       tp.tod_description
FROM tod_slots     ts
JOIN timing_plans  tp ON tp.intersection_id = ts.intersection_id
                     AND tp.scenario         = ts.scenario
                     AND tp.plan_number      = ts.plan_number
JOIN intersections i  ON i.id = ts.intersection_id
JOIN corridors     c  ON c.id = i.corridor_id;

-- -----------------------------------------------------------------------------
-- Convenience view: v_timespace plus the Major/Minor movement breakdown --
-- one row per (intersection, day_type, slot_index, movement_class), i.e. two
-- rows per v_timespace row. This is what the timespace map's band drawing
-- needs: cycle length + offset (when the cycle starts) plus, per approach,
-- how much of that cycle is green/WK/FLDW/clearance.
-- -----------------------------------------------------------------------------
CREATE VIEW v_timespace_movements AS
SELECT i.id                                            AS intersection_id,
       c.name                                          AS corridor,
       i.tab_name,
       i.name                                          AS intersection,
       i.natural_order,
       ts.scenario,
       ts.day_type,
       ts.slot_index,
       (ts.slot_index * interval '15 minutes')::time   AS slot_time,
       tp.plan_number,
       tp.cycle_length_s,
       tp.offset_s,
       pm.movement_class,
       pm.split_s,
       pm.wk_s,
       pm.fldw_s,
       pm.yellow_allred_s
FROM tod_slots       ts
JOIN timing_plans    tp ON tp.intersection_id = ts.intersection_id
                       AND tp.scenario         = ts.scenario
                       AND tp.plan_number      = ts.plan_number
JOIN plan_movements  pm ON pm.timing_plan_id = tp.id
JOIN intersections   i  ON i.id = ts.intersection_id
JOIN corridors       c  ON c.id = i.corridor_id;

COMMIT;
