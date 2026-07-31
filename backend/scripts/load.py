"""
Load extracted intersection timings into PostgreSQL.

Idempotency: an intersection is replaced wholesale on re-import. Its child rows
(channels, phase groups, splits, indications, plans) are deleted via ON DELETE
CASCADE and rebuilt, so re-running against an updated workbook converges to the
workbook's state rather than accumulating duplicates. The intersection row
itself is preserved (updated in place) so its surrogate id stays stable for
anything referencing it.

The whole import runs in one transaction: either every intersection lands or
none does. A partially-loaded corridor is worse than no corridor, because the
timing only makes sense as a set.
"""

from __future__ import annotations

import psycopg2
import psycopg2.extras

from extract import Intersection


def _upsert_corridor(cur, name: str, borough: str | None) -> int:
    cur.execute(
        """
        INSERT INTO corridors (name, borough) VALUES (%s, %s)
        ON CONFLICT (name) DO UPDATE SET borough = COALESCE(EXCLUDED.borough, corridors.borough)
        RETURNING id
        """,
        (name, borough),
    )
    return cur.fetchone()[0]


def _upsert_intersection(cur, corridor_id: int, inter: Intersection,
                         source_file: str) -> int:
    # natural_order is UNIQUE per corridor; clear any stale holder of this slot
    # before claiming it, otherwise a reordered corridor deadlocks on the
    # constraint even though the final state would be valid.
    cur.execute(
        """
        UPDATE intersections SET natural_order = -natural_order
        WHERE corridor_id = %s AND natural_order = %s AND tab_name <> %s
        """,
        (corridor_id, inter.natural_order, inter.tab_name),
    )
    cur.execute(
        """
        INSERT INTO intersections
            (corridor_id, tab_name, name, natural_order,
             major_crosswalk_ft, minor_crosswalk_ft, source_file)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (corridor_id, tab_name) DO UPDATE SET
            name               = EXCLUDED.name,
            natural_order      = EXCLUDED.natural_order,
            major_crosswalk_ft = EXCLUDED.major_crosswalk_ft,
            minor_crosswalk_ft = EXCLUDED.minor_crosswalk_ft,
            source_file        = EXCLUDED.source_file,
            imported_at        = now()
        RETURNING id
        """,
        (corridor_id, inter.tab_name, inter.name, inter.natural_order,
         inter.major_crosswalk_ft, inter.minor_crosswalk_ft, source_file),
    )
    return cur.fetchone()[0]


def _clear_children(cur, intersection_id: int) -> None:
    # phase_groups cascades to splits, which cascades to indications and
    # plan_splits; channels, timing_plans, and tod_slots are cleared directly.
    # tod_slots must go before timing_plans -- it has a composite FK onto
    # timing_plans(intersection_id, plan_number) with ON DELETE CASCADE, but
    # clearing it explicitly here (rather than relying on that cascade) keeps
    # this function the single place that answers "what gets wiped".
    cur.execute("DELETE FROM tod_slots    WHERE intersection_id = %s", (intersection_id,))
    cur.execute("DELETE FROM phase_groups WHERE intersection_id = %s", (intersection_id,))
    cur.execute("DELETE FROM channels     WHERE intersection_id = %s", (intersection_id,))
    cur.execute("DELETE FROM timing_plans WHERE intersection_id = %s", (intersection_id,))


def load_intersection(cur, corridor_id: int, inter: Intersection,
                      source_file: str) -> int:
    iid = _upsert_intersection(cur, corridor_id, inter, source_file)
    _clear_children(cur, iid)

    # channels
    channel_ids: dict[int, int] = {}
    for ch in inter.channels:
        cur.execute(
            """INSERT INTO channels (intersection_id, channel_number, kind, movement_class)
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (iid, ch.channel_number, ch.kind, ch.movement_class),
        )
        channel_ids[ch.channel_number] = cur.fetchone()[0]

    # phase groups
    group_ids: dict[int, int] = {}
    for g in inter.phase_groups:
        cur.execute(
            """INSERT INTO phase_groups (intersection_id, group_index, label)
               VALUES (%s, %s, %s) RETURNING id""",
            (iid, g.group_index, g.label),
        )
        group_ids[g.group_index] = cur.fetchone()[0]

    # splits + indications
    split_ids: dict[int, int] = {}
    indication_rows = []
    for sp in inter.splits:
        cur.execute(
            """INSERT INTO splits
                   (intersection_id, phase_group_id, split_number, position_in_group, role)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (iid, group_ids[sp.group_index], sp.split_number,
             sp.position_in_group, sp.role),
        )
        sid = cur.fetchone()[0]
        split_ids[sp.split_number] = sid
        for ch_num, code in sp.indications.items():
            indication_rows.append((sid, channel_ids[ch_num], code))

    if indication_rows:
        psycopg2.extras.execute_values(
            cur,
            "INSERT INTO split_indications (split_id, channel_id, code) VALUES %s",
            indication_rows,
        )

    # timing plans + per-plan split durations
    for plan in inter.timing_plans:
        cur.execute(
            """INSERT INTO timing_plans
                   (intersection_id, plan_number, cycle_length_s, offset_s, tod_description)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (iid, plan.plan_number, plan.cycle_length_s, plan.offset_s,
             plan.tod_description),
        )
        pid = cur.fetchone()[0]
        rows = [(pid, split_ids[n], d) for n, d in plan.durations.items()]
        if rows:
            psycopg2.extras.execute_values(
                cur,
                "INSERT INTO plan_splits (timing_plan_id, split_id, duration_s) VALUES %s",
                rows,
            )

    # time-of-day slots: which plan is active per 15-min slot, per day type.
    # Keyed by (intersection_id, plan_number) -- matching tod_slots' composite
    # FK onto timing_plans -- rather than the timing_plan id, so this insert
    # doesn't need to track pid per plan_number separately.
    if inter.tod_slots:
        slot_rows = [
            (iid, s.day_type, s.slot_index, s.plan_number) for s in inter.tod_slots
        ]
        psycopg2.extras.execute_values(
            cur,
            """INSERT INTO tod_slots (intersection_id, day_type, slot_index, plan_number)
               VALUES %s""",
            slot_rows,
        )
    return iid


def load_corridor(dsn: str, corridor_name: str, borough: str | None,
                  intersections: list[Intersection], source_file: str) -> None:
    conn = psycopg2.connect(dsn)
    try:
        with conn:
            with conn.cursor() as cur:
                cid = _upsert_corridor(cur, corridor_name, borough)
                for inter in intersections:
                    load_intersection(cur, cid, inter, source_file)
    finally:
        conn.close()
