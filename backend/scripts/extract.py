"""
Extract existing signal timings from the per-intersection tabs of the NYCDOT
corridor comparison workbook.

The tabs are all clones of Prototype_Tab, but they are NOT all the same width:
Kings_Hwy has 12 load-switch channels and 5 phase groups where the others have
8 and 4, which shifts every block to the right and pushes the offset row down.
So nothing here hardcodes a column letter for the timing blocks -- the layout is
discovered per sheet from these anchors:

    row 2      the literal 'Existing' / 'Proposed'  -> start of each timing block
    row 9      channel numbers 1..N (twice: existing, then proposed)
    rows 4/5   'Veh Assign' / 'Ped Assign' class per channel
    col A/B    split number and role, in 11-row bands (10 splits + 1 subtotal)
    row 6/7    plan numbers and time-of-day description
    row 16     cycle length per plan
    <offset>   the row labelled 'OFFSET'; values sit on the row below it
    row 14     'WeekdayExistingPlan' / 'WeekendExistingPlan' headers -> start of the
               96-row (15-min slot) plan-resolution columns below them

Only the Existing block is read. Proposed timings are out of scope.

The row-14 headers are a second, independent anchor from the row 7
tod_description text: they mark the workbook's own precomputed day/time ->
plan lookup table (what the Time_SpaceMap tab's VLOOKUPs read from), already
expanded to one row per 15-minute slot. tod_description stays free text for
display/provenance only -- it's not reliably parseable on its own (some
cells pack multiple disjoint windows into one string), so the slot-level
resolution is read from these columns directly instead of derived from it.

Like the main timing block, this column is NOT at a fixed letter -- Kings_Hwy's
extra channels/phase groups shift it right (AX/AY everywhere else, BF/BG at
Kings_Hwy), so it's located by scanning row 14 for the header text, not
hardcoded.

A second summary block (further right, rows ~65-92 on a standard tab, shifted
to ~76-103 on Kings_Hwy) gives the same Existing plans' approach-level detail
the Time_SpaceMap tab draws bands from: per plan, the Major and Minor
streets' vehicle green ("Split"), pedestrian WALK ("WK"), flashing DON'T WALK
("FLDW"), and combined yellow+all-red clearance ("Y+AR"). This is *not*
re-derivable by summing split_indications per channel.movement_class: several
tabs (Kings_Hwy, E_58_St) have more than one vehicle channel sharing the same
movement_class (e.g. a through + a protected-left channel both tagged
'Major'), so a generic per-channel sum would double-count. The workbook
resolves that ambiguity by hand, pointing each of these eight cells at one
specific channel per tab -- so, like the TOD slot columns above, these are
read as the workbook's own precomputed answer rather than re-derived.
The block is a fixed template relative to its own 'MajorG' anchor cell (see
_read_plan_movements), which is located by scanning rather than hardcoding
row/column, since that anchor itself moves tab to tab exactly like everything
else here.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from openpyxl.utils import get_column_letter

# Workbook layout constants that ARE stable across every tab.
ROW_BLOCK_HEADER = 2      # 'Existing' / 'Proposed'
ROW_VEH_ASSIGN = 4
ROW_PED_ASSIGN = 5
ROW_PLAN_NUMBER = 6
ROW_TOD = 7
ROW_CHANNEL_HEADER = 9
ROW_CYCLE_LENGTH = 16
ROW_FIRST_SPLIT = 18
GROUP_STRIDE = 11         # 10 split rows + 1 subtotal row per phase group
SPLITS_PER_GROUP = 10
MAX_PHASE_GROUPS = 8
MAX_SCAN_COL = 200

# Time-of-day slot resolution table: 96 rows (15-minute slots, 00:00-23:45)
# below a header row, holding the Existing plan number active in that slot.
# Same range the Time_SpaceMap tab's own VLOOKUPs (DG16:DI111) read from.
ROW_TOD_SLOT_HEADER = 14
TOD_SLOT_FIRST_ROW = 16
TOD_SLOT_LAST_ROW = 111
TOD_SLOT_COUNT = TOD_SLOT_LAST_ROW - TOD_SLOT_FIRST_ROW + 1  # 96
TOD_SLOT_HEADERS = {
    "weekday": "WeekdayExistingPlan",
    "weekend": "WeekendExistingPlan",
}

# Approach-level movement summary block: an anchor cell ('MajorG') plus fixed
# row/column offsets from it -- verified stable across every tab, including
# Kings_Hwy where the anchor itself sits at a different row/column than
# everywhere else. One column per plan, starting 3 columns right of the
# anchor's column and going left-to-right in plan_number order (1, 2, 3, ...);
# this requires plan numbers to be contiguous starting at 1, which is
# validated before use (see _read_plan_movements).
MOVEMENT_ANCHOR_LABEL = "MajorG"
MOVEMENT_VALUE_COL_OFFSET = 3   # anchor col -> first plan's value column
MOVEMENT_ROW_OFFSETS = {
    # (movement_class, metric): row offset from the 'MajorG' anchor row
    ("Major", "split_s"): 7,          # 'MajorSplit'
    ("Major", "wk_s"): 5,             # 'MajorWK'
    ("Major", "fldw_s"): 6,           # 'MajorFLDW'
    ("Major", "yellow_allred_s"): 9,  # 'MajorY+AR'
    ("Minor", "split_s"): 12 + 7,     # 'MinorSplit'  (Minor block starts +12 rows)
    ("Minor", "wk_s"): 12 + 5,        # 'MinorWK'
    ("Minor", "fldw_s"): 12 + 6,      # 'MinorFLDW'
    ("Minor", "yellow_allred_s"): 12 + 9,  # 'MinorY+AR'
}
# What _text() must read at each offset -- a defensive check, not a lookup:
# if the workbook's layout ever drifts, this fails loudly instead of quietly
# reading the wrong cell.
MOVEMENT_ROW_LABELS = {
    ("Major", "split_s"): "MajorSplit",
    ("Major", "wk_s"): "MajorWK",
    ("Major", "fldw_s"): "MajorFLDW",
    ("Major", "yellow_allred_s"): "MajorY+AR",
    ("Minor", "split_s"): "MinorSplit",
    ("Minor", "wk_s"): "MinorWK",
    ("Minor", "fldw_s"): "MinorFLDW",
    ("Minor", "yellow_allred_s"): "MinorY+AR",
}

PHASE_LABEL_RE = re.compile(r"^PHASE\s+([A-Z])$", re.IGNORECASE)


class LayoutError(Exception):
    """The sheet does not match the expected Prototype_Tab layout."""


@dataclass
class Channel:
    channel_number: int
    kind: str                 # 'vehicle' | 'pedestrian'
    movement_class: str | None  # 'Major' | 'Minor' | None


@dataclass
class Split:
    split_number: int
    group_index: int
    position_in_group: int
    role: str | None
    indications: dict[int, str] = field(default_factory=dict)  # channel_number -> code


@dataclass
class PhaseGroup:
    group_index: int
    label: str


@dataclass
class MovementSummary:
    movement_class: str    # 'Major' | 'Minor'
    split_s: int            # vehicle green ("Split")
    wk_s: int                # pedestrian WALK
    fldw_s: int              # pedestrian flashing DON'T WALK
    yellow_allred_s: int     # combined yellow + all-red clearance


@dataclass
class TimingPlan:
    plan_number: int
    cycle_length_s: int
    offset_s: int
    tod_description: str | None
    durations: dict[int, int] = field(default_factory=dict)  # split_number -> seconds
    movements: list[MovementSummary] = field(default_factory=list)  # Major + Minor summary


@dataclass
class TodSlot:
    day_type: str        # 'weekday' | 'weekend'
    slot_index: int       # 0 = 00:00 ... 95 = 23:45 (15-minute resolution)
    plan_number: int      # must match a TimingPlan.plan_number on the same intersection


@dataclass
class Intersection:
    tab_name: str
    name: str
    natural_order: int
    major_crosswalk_ft: float | None
    minor_crosswalk_ft: float | None
    channels: list[Channel]
    phase_groups: list[PhaseGroup]
    splits: list[Split]
    timing_plans: list[TimingPlan]
    tod_slots: list[TodSlot] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------
# small cell helpers
# --------------------------------------------------------------------------

def _cell(ws, row, col):
    v = ws.cell(row=row, column=col).value
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        # Excel error literals leak through as strings when read with data_only.
        if v == "" or v.startswith("#"):
            return None
    return v


def _int(ws, row, col):
    v = _cell(ws, row, col)
    if v is None:
        return None
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return None


def _text(ws, row, col):
    v = _cell(ws, row, col)
    return None if v is None else str(v)


# --------------------------------------------------------------------------
# layout discovery
# --------------------------------------------------------------------------

def _find_existing_block(ws) -> int:
    """Column index where the Existing timing block starts (row 2 == 'Existing')."""
    for col in range(1, MAX_SCAN_COL):
        if _text(ws, ROW_BLOCK_HEADER, col) == "Existing":
            return col
    raise LayoutError("no 'Existing' marker found in row 2")


def _find_channels(ws) -> list[Channel]:
    """
    Row 9 holds channel numbers for the Existing block, then restarts at 1 for
    the Proposed block. Read the first ascending run only.
    """
    channels: list[Channel] = []
    col = 3  # column C
    expected = 1
    while col < MAX_SCAN_COL:
        n = _int(ws, ROW_CHANNEL_HEADER, col)
        if n != expected:
            break
        veh = _text(ws, ROW_VEH_ASSIGN, col)
        ped = _text(ws, ROW_PED_ASSIGN, col)
        if veh and ped:
            raise LayoutError(
                f"channel {n} (col {get_column_letter(col)}) is assigned as both "
                f"vehicle and pedestrian"
            )
        kind = "pedestrian" if ped else "vehicle"
        channels.append(Channel(channel_number=n, kind=kind, movement_class=veh or ped))
        col += 1
        expected += 1
    if not channels:
        raise LayoutError("no channel numbers found in row 9")
    return channels


def _find_offset_label_row(ws, existing_col: int) -> int:
    """
    Locate the 'OFFSET' label, which terminates the phase-group bands.

    This must be found by scanning, not computed from the number of populated
    phase groups: every tab reserves a fixed number of 11-row bands regardless
    of how many it actually uses (Flatbush reserves 4 bands but only fills
    Phase A and Phase B), so counting used groups lands short of the real row.
    """
    for row in range(ROW_FIRST_SPLIT, ROW_FIRST_SPLIT + GROUP_STRIDE * MAX_PHASE_GROUPS + 2):
        if _text(ws, row, existing_col) == "OFFSET":
            return row
    raise LayoutError("no 'OFFSET' label found below the split rows")


def _find_phase_groups(ws, off_label_row: int) -> list[PhaseGroup]:
    """
    Each reserved band starts at ROW_FIRST_SPLIT + 11*(g-1) and is headed by a
    'PHASE X' role in column B. Unused bands are blank and are skipped, not
    treated as the end of the list.
    """
    n_bands = (off_label_row - ROW_FIRST_SPLIT) // GROUP_STRIDE
    if n_bands < 1:
        raise LayoutError(f"implausible phase-group band count ({n_bands})")

    groups: list[PhaseGroup] = []
    for g in range(n_bands):
        row = ROW_FIRST_SPLIT + GROUP_STRIDE * g
        label = _text(ws, row, 2)
        if not label:
            continue
        m = PHASE_LABEL_RE.match(label)
        if not m:
            continue
        groups.append(PhaseGroup(group_index=g + 1, label=f"Phase {m.group(1).upper()}"))
    if not groups:
        raise LayoutError("no 'PHASE X' band headers found")
    return groups


# --------------------------------------------------------------------------
# block readers
# --------------------------------------------------------------------------

def _read_splits(ws, groups: list[PhaseGroup], channels: list[Channel]) -> list[Split]:
    splits: list[Split] = []
    for grp in groups:
        base = ROW_FIRST_SPLIT + GROUP_STRIDE * (grp.group_index - 1)
        for pos in range(SPLITS_PER_GROUP):
            row = base + pos
            role = _text(ws, row, 2)
            if not role:
                break  # unused slots in the 10-row band; they are always trailing
            num = _int(ws, row, 1)
            if num is None:
                raise LayoutError(f"row {row}: role {role!r} present but no split number")
            sp = Split(
                split_number=num,
                group_index=grp.group_index,
                position_in_group=pos + 1,
                role=role,
            )
            for ch in channels:
                code = _text(ws, row, 2 + ch.channel_number)  # col C == channel 1
                if code:
                    sp.indications[ch.channel_number] = code
            splits.append(sp)
    return splits


def _read_plans(ws, existing_col: int, off_label_row: int,
                splits: list[Split]) -> list[TimingPlan]:
    off_row = off_label_row + 1

    plans: list[TimingPlan] = []
    col = existing_col
    expected = 1
    while col < MAX_SCAN_COL:
        n = _int(ws, ROW_PLAN_NUMBER, col)
        if n != expected:
            break
        cycle = _int(ws, ROW_CYCLE_LENGTH, col)
        offset = _int(ws, off_row, col)
        if not cycle:
            break  # unused plan column
        plan = TimingPlan(
            plan_number=n,
            cycle_length_s=cycle,
            offset_s=offset or 0,
            tod_description=_text(ws, ROW_TOD, col),
        )
        for sp in splits:
            base = ROW_FIRST_SPLIT + GROUP_STRIDE * (sp.group_index - 1)
            row = base + sp.position_in_group - 1
            dur = _int(ws, row, col)
            plan.durations[sp.split_number] = dur or 0
        plans.append(plan)
        col += 1
        expected += 1
    if not plans:
        raise LayoutError("no timing plans found")
    return plans


def _find_tod_slot_column(ws, header_text: str) -> int:
    """Column index below the given row-14 header (e.g. 'WeekdayExistingPlan')."""
    for col in range(1, MAX_SCAN_COL):
        if _text(ws, ROW_TOD_SLOT_HEADER, col) == header_text:
            return col
    raise LayoutError(f"no {header_text!r} header found in row {ROW_TOD_SLOT_HEADER}")


def _read_tod_slots(ws, known_plan_numbers: set[int]) -> list[TodSlot]:
    """
    Read the plan-resolution columns into one TodSlot per 15-minute slot per
    day type (2 * 96 = 192 total).

    Each value must resolve to a plan already read off this same tab by
    _read_plans -- if it doesn't, either the workbook's own lookup table is
    stale/broken or these two blocks were misread relative to each other,
    and either way loading it would produce a tod_slots row with no matching
    timing_plans row for this intersection.
    """
    slots: list[TodSlot] = []
    for day_type, header_text in TOD_SLOT_HEADERS.items():
        col = _find_tod_slot_column(ws, header_text)
        col_letter = get_column_letter(col)
        for slot_index, row in enumerate(range(TOD_SLOT_FIRST_ROW, TOD_SLOT_LAST_ROW + 1)):
            n = _int(ws, row, col)
            if n is None:
                raise LayoutError(
                    f"{day_type} plan-resolution cell {col_letter}{row} is blank/#N/A -- "
                    "workbook's Time_SpaceMap lookup table isn't fully resolved"
                )
            if n not in known_plan_numbers:
                raise LayoutError(
                    f"{day_type} slot {slot_index} ({col_letter}{row}) resolves to plan "
                    f"{n}, which isn't among this tab's Existing plans {sorted(known_plan_numbers)}"
                )
            slots.append(TodSlot(day_type=day_type, slot_index=slot_index, plan_number=n))
    return slots


def _find_movement_anchor(ws) -> tuple[int, int]:
    """(row, col) of the 'MajorG' cell that anchors the movement summary block."""
    for row in range(1, MAX_SCAN_COL):
        for col in range(1, MAX_SCAN_COL):
            if _text(ws, row, col) == MOVEMENT_ANCHOR_LABEL:
                return row, col
    raise LayoutError(f"no {MOVEMENT_ANCHOR_LABEL!r} anchor cell found")


def _read_plan_movements(ws, plan_numbers: list[int]) -> dict[int, list[MovementSummary]]:
    """
    Read the Major/Minor Split/WK/FLDW/Y+AR summary block into
    {plan_number: [MovementSummary(Major), MovementSummary(Minor)]}.

    Requires plan_numbers to be contiguous starting at 1 -- that's how this
    block's plan columns are addressed (no plan-number header of its own to
    match against, unlike _read_plans/_read_tod_slots).
    """
    if plan_numbers != list(range(1, len(plan_numbers) + 1)):
        raise LayoutError(
            f"movement summary block assumes plan numbers 1..N contiguous, got {plan_numbers}"
        )

    anchor_row, anchor_col = _find_movement_anchor(ws)
    value_start_col = anchor_col + MOVEMENT_VALUE_COL_OFFSET

    by_plan: dict[int, dict[str, dict[str, int]]] = {
        n: {"Major": {}, "Minor": {}} for n in plan_numbers
    }
    for (movement_class, metric), row_offset in MOVEMENT_ROW_OFFSETS.items():
        row = anchor_row + row_offset
        label = MOVEMENT_ROW_LABELS[(movement_class, metric)]
        actual_label = _text(ws, row, anchor_col)
        if actual_label != label:
            raise LayoutError(
                f"expected {label!r} at row {row} (anchor+{row_offset}), col "
                f"{get_column_letter(anchor_col)}, found {actual_label!r}"
            )
        for plan_number in plan_numbers:
            col = value_start_col + (plan_number - 1)
            value = _int(ws, row, col)
            if value is None:
                raise LayoutError(
                    f"{label} for plan {plan_number} ({get_column_letter(col)}{row}) "
                    "is blank/#N/A"
                )
            by_plan[plan_number][movement_class][metric] = value

    return {
        n: [
            MovementSummary(movement_class=mc, **metrics)
            for mc, metrics in movements.items()
        ]
        for n, movements in by_plan.items()
    }


# --------------------------------------------------------------------------
# validation
# --------------------------------------------------------------------------

def _validate(inter: Intersection) -> None:
    """
    Non-fatal consistency checks, recorded on the intersection.

    The workbook enforces 'total split time equals cycle length' in the source
    controller report, so a mismatch means either a real data problem or a
    layout misread -- both worth surfacing rather than silently loading.
    """
    for plan in inter.timing_plans:
        total = sum(plan.durations.values())
        if total != plan.cycle_length_s:
            inter.warnings.append(
                f"plan {plan.plan_number}: splits sum to {total}s but cycle "
                f"length is {plan.cycle_length_s}s"
            )
        if plan.offset_s >= plan.cycle_length_s:
            inter.warnings.append(
                f"plan {plan.plan_number}: offset {plan.offset_s}s >= cycle "
                f"length {plan.cycle_length_s}s"
            )
    nums = [s.split_number for s in inter.splits]
    if nums != sorted(nums) or len(set(nums)) != len(nums):
        inter.warnings.append("split numbers are not strictly increasing/unique")


# --------------------------------------------------------------------------
# public API
# --------------------------------------------------------------------------

def extract_intersection(ws, tab_name: str, display_name: str,
                         natural_order: int) -> Intersection:
    existing_col = _find_existing_block(ws)
    channels = _find_channels(ws)
    off_label_row = _find_offset_label_row(ws, existing_col)
    groups = _find_phase_groups(ws, off_label_row)
    splits = _read_splits(ws, groups, channels)
    plans = _read_plans(ws, existing_col, off_label_row, splits)
    tod_slots = _read_tod_slots(ws, known_plan_numbers={p.plan_number for p in plans})
    movements_by_plan = _read_plan_movements(ws, [p.plan_number for p in plans])
    for plan in plans:
        plan.movements = movements_by_plan[plan.plan_number]

    # Crosswalk widths live just below the timing block, labelled in column B.
    major = minor = None
    for row in range(off_label_row, off_label_row + 25):
        label = _text(ws, row, 2)
        if label == "Major" and _int(ws, row, 3) is not None:
            major = _int(ws, row, 3)
        elif label == "Minor" and _int(ws, row, 3) is not None:
            minor = _int(ws, row, 3)

    inter = Intersection(
        tab_name=tab_name,
        name=display_name,
        natural_order=natural_order,
        major_crosswalk_ft=major,
        minor_crosswalk_ft=minor,
        channels=channels,
        phase_groups=groups,
        splits=splits,
        timing_plans=plans,
        tod_slots=tod_slots,
    )
    _validate(inter)
    return inter


def read_intersection_index(wb) -> list[tuple[str, str, int]]:
    """
    Pair each intersection tab with its display name and spatial order.

    'IntersectionList' gives id -> display name in corridor order; the
    'IQL Tab Setup' data bank (cols Q/R/S = natural order, id, tab name) gives
    id -> tab name. Joining on id avoids guessing the mapping from tab names,
    which do not match the display names exactly (Bedford_Ave vs
    'Bedford Ave & Caton Ave').
    """
    names: dict[int, str] = {}
    ws = wb["IntersectionList"]
    for row in range(2, ws.max_row + 1):
        ident = _int(ws, row, 1)
        name = _text(ws, row, 2)
        if ident is not None and name:
            names[ident] = name

    setup = wb["IQL Tab Setup"]
    out: list[tuple[str, str, int]] = []
    seen: set[str] = set()
    for row in range(14, 400):
        order = _int(setup, row, 17)   # col Q: natural order
        ident = _int(setup, row, 18)   # col R: id
        tab = _text(setup, row, 19)    # col S: tab name
        if not tab or order is None:
            continue
        if tab in seen or tab not in wb.sheetnames:
            continue
        seen.add(tab)
        display = names.get(ident) or tab.replace("_", " ")
        out.append((tab, display, order))

    out.sort(key=lambda r: r[2])
    return out
