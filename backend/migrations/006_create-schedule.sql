-- Up Migration

-- Weekly opening times. Closed days have no rows. A day may have several ranges (lunch break).
CREATE TABLE working_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- 1 = Monday ... 7 = Sunday (ISO standard)
  CONSTRAINT working_hours_day_check CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT working_hours_time_order CHECK (end_time > start_time)
);
CREATE INDEX working_hours_business_day_idx ON working_hours (business_id, day_of_week);
CREATE TRIGGER working_hours_set_updated_at BEFORE UPDATE ON working_hours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Periods when the business cannot be booked (holidays, breaks).
CREATE TABLE blocked_times (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_times_time_order CHECK (ends_at > starts_at)
);
CREATE INDEX blocked_times_business_start_idx ON blocked_times (business_id, starts_at);

-- Down Migration

DROP TABLE IF EXISTS blocked_times;
DROP TABLE IF EXISTS working_hours;
