-- Up Migration

CREATE TABLE reservations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES businesses (id) ON DELETE RESTRICT,
  customer_id      uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  service_id       uuid NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  -- Snapshots: what the customer booked, even if the service changes later.
  service_name     text NOT NULL,
  price_type       text NOT NULL,
  price_cents      integer,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending',
  customer_notes   text,
  customer_phone   text,
  business_message text,
  cancelled_by     text,
  confirmed_at     timestamptz,
  rejected_at      timestamptz,
  cancelled_at     timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservations_time_order CHECK (ends_at > starts_at),
  CONSTRAINT reservations_status_check
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  CONSTRAINT reservations_cancelled_by_check
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'business', 'system')),
  CONSTRAINT reservations_price_not_negative CHECK (price_cents IS NULL OR price_cents >= 0),
  CONSTRAINT reservations_notes_length CHECK (customer_notes IS NULL OR char_length(customer_notes) <= 1000),
  CONSTRAINT reservations_message_length CHECK (business_message IS NULL OR char_length(business_message) <= 1000),
  -- NO DOUBLE BOOKINGS: two pending/confirmed reservations of the same business may not overlap.
  -- '[)' = the end time is not included, so 10:00-10:30 and 10:30-11:00 are allowed back to back.
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    business_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed'))
);
CREATE INDEX reservations_business_start_idx ON reservations (business_id, starts_at);
CREATE INDEX reservations_customer_start_idx ON reservations (customer_id, starts_at DESC);
CREATE INDEX reservations_status_start_idx ON reservations (status, starts_at);
CREATE TRIGGER reservations_set_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS reservations;
