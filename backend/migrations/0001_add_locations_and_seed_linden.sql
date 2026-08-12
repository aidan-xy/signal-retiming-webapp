-- =============================================================================
-- Add corridor/intersection coordinates and seed the Linden Blvd corridor.
--
-- Two parts, both idempotent so this can be run against a database that was
-- built from an older schema.sql (columns added with IF NOT EXISTS) and re-run
-- safely:
--
--   1. ADD the lat/lon columns to corridors and intersections. Fresh installs
--      already get these from schema.sql; this covers databases loaded before
--      the columns existed.
--   2. SEED the real signal coordinates for the Linden Blvd corridor. These
--      values were previously hardcoded in the frontend
--      (frontend/src/utils/corridorCoordinates.js), extracted from NYCDOT's
--      TO14 signal KMZ. They are keyed to intersections by natural_order, which
--      the KMZ 'order' matches (west -> east, Flatbush Ave to Kings Hwy).
--
-- The corridor's own center (corridors.lat/lon) is derived from the mean of its
-- seeded intersections rather than hardcoded, so it stays correct if the set of
-- intersections changes.
-- =============================================================================

BEGIN;

-- 1. Columns --------------------------------------------------------------------
ALTER TABLE corridors     ADD COLUMN IF NOT EXISTS lat numeric(9,6);
ALTER TABLE corridors     ADD COLUMN IF NOT EXISTS lon numeric(9,6);
ALTER TABLE intersections ADD COLUMN IF NOT EXISTS lat numeric(9,6);
ALTER TABLE intersections ADD COLUMN IF NOT EXISTS lon numeric(9,6);

-- 2. Seed Linden Blvd intersection coordinates ----------------------------------
-- Matched on (corridor = 'Linden Blvd', natural_order). cross_street is carried
-- only for readability / cross-checking against intersections.name.
UPDATE intersections i
SET    lat = v.lat,
       lon = v.lon
FROM  (VALUES
    ( 1, 'Flatbush Ave',            40.652147::numeric, -73.959153::numeric),
    ( 2, 'Bedford Ave & Caton Ave', 40.652330::numeric, -73.956006::numeric),
    ( 3, 'Rogers Ave',              40.652495::numeric, -73.952670::numeric),
    ( 4, 'Nostrand Ave',            40.652646::numeric, -73.949786::numeric),
    ( 5, 'New York Ave',            40.652793::numeric, -73.946889::numeric),
    ( 6, 'E. 34 St',                40.652851::numeric, -73.945914::numeric),
    ( 7, 'E. 35 St',                40.652911::numeric, -73.944976::numeric),
    ( 8, 'Brooklyn Ave',            40.652968::numeric, -73.944019::numeric),
    ( 9, 'E. 37 St',                40.653031::numeric, -73.943045::numeric),
    (10, 'E. 38 St',                40.653094::numeric, -73.942105::numeric),
    (11, 'E. 39 St',                40.653154::numeric, -73.941175::numeric),
    (12, 'E. 40 St',                40.653203::numeric, -73.940236::numeric),
    (13, 'Albany Ave',              40.653276::numeric, -73.939268::numeric),
    (14, 'E. 43 St',                40.653396::numeric, -73.937367::numeric),
    (15, 'Troy Ave',                40.653445::numeric, -73.936402::numeric),
    (16, 'E. 45 St',                40.653505::numeric, -73.935424::numeric),
    (17, 'E. 46 St',                40.653559::numeric, -73.934493::numeric),
    (18, 'Schenectady Ave',         40.653634::numeric, -73.933524::numeric),
    (19, 'E. 48 St',                40.653684::numeric, -73.932558::numeric),
    (20, 'E. 49 St',                40.653747::numeric, -73.931616::numeric),
    (21, 'Utica Ave',               40.653815::numeric, -73.930625::numeric),
    (22, 'E. 51 St',                40.653870::numeric, -73.929612::numeric),
    (23, 'E. 52 St',                40.653934::numeric, -73.928680::numeric),
    (24, 'E. 53 St',                40.653984::numeric, -73.927713::numeric),
    (25, 'E. 54 St',                40.654043::numeric, -73.926727::numeric),
    (26, 'E. 55 St',                40.654092::numeric, -73.925801::numeric),
    (27, 'E. 56 St',                40.654156::numeric, -73.924838::numeric),
    (28, 'E. 57 St',                40.654214::numeric, -73.923858::numeric),
    (29, 'E. 58 St',                40.654274::numeric, -73.922926::numeric),
    (30, 'Kings Hwy',               40.654315::numeric, -73.922168::numeric)
) AS v(natural_order, cross_street, lat, lon),
      corridors c
WHERE i.corridor_id = c.id
  AND c.name = 'Linden Blvd'
  AND i.natural_order = v.natural_order;

-- 3. Derive the corridor center from its seeded intersections -------------------
UPDATE corridors c
SET    lat = agg.lat,
       lon = agg.lon
FROM  (
    SELECT corridor_id,
           round(avg(lat), 6) AS lat,
           round(avg(lon), 6) AS lon
    FROM   intersections
    WHERE  lat IS NOT NULL AND lon IS NOT NULL
    GROUP  BY corridor_id
) AS agg
WHERE c.id = agg.corridor_id
  AND c.name = 'Linden Blvd';

COMMIT;
