# Signal Timing API

Thin, read-only FastAPI + SQLAlchemy ORM API over the signal-timing
database defined in `schema.sql`. It has no write endpoints — loading data
is `import_workbook.py`'s job, not this API's. Point it at a SELECT-only
database role.

## Setup

```bash
pip install -r requirements.txt

export SIGNALS_DSN="postgresql://signals_ro@localhost/signals"
uvicorn app.main:app --reload
```

Interactive docs at `http://localhost:8000/docs`.

## Layout

```
app/
  database.py   engine/session (reads SIGNALS_DSN or DATABASE_URL)
  models.py     ORM mapping onto the existing tables — no create_all(),
                schema.sql remains the single source of DDL truth
  schemas.py    Pydantic response models
  routers/
    corridors.py      corridors, and their intersections
    intersections.py  intersection detail: channels, phase groups,
                       splits (+indications), timing plans (+durations)
    timing.py          filtered query over the v_plan_timing view
  main.py       app assembly + /health
```

## Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/corridors` | all corridors |
| GET | `/corridors/{id}` | one corridor |
| GET | `/corridors/{id}/intersections` | that corridor's intersections, in corridor order |
| GET | `/intersections/{id}` | one intersection (crosswalk widths, provenance) |
| GET | `/intersections/{id}/channels` | load-switch channels |
| GET | `/intersections/{id}/phase-groups` | Phase A..E groups in use |
| GET | `/intersections/{id}/splits` | splits with their per-channel indications |
| GET | `/intersections/{id}/timing-plans` | timing plans (cycle, offset, TOD) |
| GET | `/intersections/{id}/timing-plans/{plan_number}` | one plan with per-split durations |
| GET | `/timing?corridor=&tab_name=&plan_number=&limit=&offset=` | flattened rows from `v_plan_timing`, filterable |
| GET | `/health` | `SELECT 1` liveness check |

All list/detail lookups 404 on a missing corridor/intersection/plan rather
than silently returning an empty body.

## Notes

- `models.py` maps the two Postgres enum types (`channel_kind`,
  `street_class`) with `create_type=False` — they're owned by `schema.sql`,
  not by this API.
- `/timing` queries the `v_plan_timing` view directly via `text()` rather
  than an ORM class, since a view with no primary key isn't a real entity —
  it's a query the schema pre-baked for you.
- Verified end-to-end against a live PostgreSQL 16 instance loaded from the
  real `schema.sql`, covering every endpoint and the 404 paths.
