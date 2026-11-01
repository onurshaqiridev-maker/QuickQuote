-- Up Migration

CREATE TABLE quote_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        uuid NOT NULL REFERENCES businesses (id) ON DELETE RESTRICT,
  customer_id        uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  -- NULL = a general request, not about one specific service.
  service_id         uuid REFERENCES services (id) ON DELETE SET NULL,
  subject            text NOT NULL,
  description        text NOT NULL,
  preferred_date     date,
  budget_cents       integer,
  customer_phone     text,
  status             text NOT NULL DEFAULT 'pending',
  quoted_price_cents integer,
  business_message   text,
  responded_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_requests_subject_length CHECK (char_length(subject) BETWEEN 3 AND 150),
  CONSTRAINT quote_requests_description_length CHECK (char_length(description) BETWEEN 10 AND 3000),
  CONSTRAINT quote_requests_status_check CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  CONSTRAINT quote_requests_budget_not_negative CHECK (budget_cents IS NULL OR budget_cents >= 0),
  CONSTRAINT quote_requests_quote_not_negative CHECK (quoted_price_cents IS NULL OR quoted_price_cents >= 0),
  CONSTRAINT quote_requests_message_length CHECK (business_message IS NULL OR char_length(business_message) <= 3000)
);
CREATE INDEX quote_requests_business_status_idx ON quote_requests (business_id, status, created_at DESC);
CREATE INDEX quote_requests_customer_idx ON quote_requests (customer_id, created_at DESC);
CREATE TRIGGER quote_requests_set_updated_at BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS quote_requests;
