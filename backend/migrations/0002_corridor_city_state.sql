-- =============================================================================
-- Rename corridors.borough -> corridors.city and add corridors.state.
--
-- Idempotent: safe to run against a database that still has `borough`, one
-- already migrated to `city`, or a fresh schema.sql build. Existing borough
-- values (e.g. 'Brooklyn') are preserved under the new column name.
-- =============================================================================

BEGIN;

-- borough -> city (only if the old column is still present and the new one
-- isn't yet), otherwise ensure `city` exists.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'corridors' AND column_name = 'borough')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'corridors' AND column_name = 'city')
    THEN
        ALTER TABLE corridors RENAME COLUMN borough TO city;
    END IF;
END $$;

ALTER TABLE corridors ADD COLUMN IF NOT EXISTS city  text;
ALTER TABLE corridors ADD COLUMN IF NOT EXISTS state text;

-- Backfill state for the seeded Linden Blvd corridor (city already carried
-- over from borough as 'Brooklyn').
UPDATE corridors
SET    state = COALESCE(state, 'NY'),
       city  = COALESCE(city, 'Brooklyn')
WHERE  name = 'Linden Blvd';

COMMIT;
