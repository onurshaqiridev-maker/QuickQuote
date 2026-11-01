-- Up Migration

-- What a business offers, with prices. (Called "offerings" in the backend code.)
CREATE TABLE services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  price_type       text NOT NULL DEFAULT 'fixed',
  price_cents      integer,
  duration_minutes integer,
  is_bookable      boolean NOT NULL DEFAULT true,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
  CONSTRAINT services_description_length CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT services_price_type_check CHECK (price_type IN ('fixed', 'starting_from', 'on_request')),
  CONSTRAINT services_price_not_negative CHECK (price_cents IS NULL OR price_cents >= 0),
  CONSTRAINT services_price_required CHECK (price_type = 'on_request' OR price_cents IS NOT NULL),
  CONSTRAINT services_duration_range CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 480),
  CONSTRAINT services_bookable_needs_duration CHECK (is_bookable = false OR duration_minutes IS NOT NULL)
);
CREATE INDEX services_business_active_idx ON services (business_id, is_active);
CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS services;
