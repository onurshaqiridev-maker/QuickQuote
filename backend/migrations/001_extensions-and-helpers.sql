-- Up Migration

-- btree_gist: needed for the "no double bookings" rule on reservations.
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- pg_trgm: makes "business name contains..." searches fast.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Keeps every table's updated_at column correct automatically.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Down Migration

DROP FUNCTION IF EXISTS set_updated_at();
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS btree_gist;
