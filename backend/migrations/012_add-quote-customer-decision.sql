-- Up Migration

-- After a business sends a quote (status "completed"), the customer can accept or decline it.
-- The status stays "completed"; the decision is stored next to it, so the business's status flow does not change.
ALTER TABLE quote_requests
  ADD COLUMN customer_decision   text,
  ADD COLUMN customer_decided_at timestamptz,
  ADD CONSTRAINT quote_requests_customer_decision_check
    CHECK (customer_decision IS NULL OR customer_decision IN ('accepted', 'declined')),
  ADD CONSTRAINT quote_requests_decision_needs_quote
    CHECK (customer_decision IS NULL OR status = 'completed'),
  ADD CONSTRAINT quote_requests_decision_has_time
    CHECK ((customer_decision IS NULL) = (customer_decided_at IS NULL));

-- Down Migration

ALTER TABLE quote_requests
  DROP CONSTRAINT IF EXISTS quote_requests_decision_has_time,
  DROP CONSTRAINT IF EXISTS quote_requests_decision_needs_quote,
  DROP CONSTRAINT IF EXISTS quote_requests_customer_decision_check,
  DROP COLUMN IF EXISTS customer_decided_at,
  DROP COLUMN IF EXISTS customer_decision;
