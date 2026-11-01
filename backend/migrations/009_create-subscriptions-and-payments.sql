-- Up Migration

CREATE TABLE subscription_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL,
  name             text NOT NULL,
  description      text,
  price_cents      integer NOT NULL,
  currency         text NOT NULL DEFAULT 'EUR',
  billing_interval text NOT NULL DEFAULT 'month',
  max_services     integer,  -- NULL = unlimited
  max_photos       integer NOT NULL,
  is_featured      boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_code_unique UNIQUE (code),
  CONSTRAINT subscription_plans_price_not_negative CHECK (price_cents >= 0),
  CONSTRAINT subscription_plans_interval_check CHECK (billing_interval IN ('month')),
  CONSTRAINT subscription_plans_max_services_check CHECK (max_services IS NULL OR max_services >= 0),
  CONSTRAINT subscription_plans_max_photos_check CHECK (max_photos >= 0)
);
CREATE TRIGGER subscription_plans_set_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          uuid NOT NULL REFERENCES businesses (id) ON DELETE RESTRICT,
  plan_id              uuid NOT NULL REFERENCES subscription_plans (id) ON DELETE RESTRICT,
  next_plan_id         uuid REFERENCES subscription_plans (id) ON DELETE RESTRICT,
  status               text NOT NULL,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at         timestamptz,
  ended_at             timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('pending_payment', 'active', 'past_due', 'cancelled', 'expired')),
  CONSTRAINT subscriptions_period_order
    CHECK (current_period_end IS NULL OR current_period_end > current_period_start)
);
-- At most ONE "current" subscription per business; old ones stay as history.
CREATE UNIQUE INDEX subscriptions_one_current_per_business
  ON subscriptions (business_id)
  WHERE status IN ('pending_payment', 'active', 'past_due');
CREATE INDEX subscriptions_status_period_end_idx ON subscriptions (status, current_period_end);
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        uuid NOT NULL REFERENCES businesses (id) ON DELETE RESTRICT,
  subscription_id    uuid NOT NULL REFERENCES subscriptions (id) ON DELETE RESTRICT,
  plan_id            uuid NOT NULL REFERENCES subscription_plans (id) ON DELETE RESTRICT,
  purpose            text NOT NULL,
  amount_cents       integer NOT NULL,
  currency           text NOT NULL DEFAULT 'EUR',
  status             text NOT NULL DEFAULT 'pending',
  provider           text NOT NULL,
  provider_reference text,
  period_start       timestamptz,
  period_end         timestamptz,
  paid_at            timestamptz,
  failed_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_purpose_check CHECK (purpose IN ('initial', 'renewal')),
  CONSTRAINT payments_amount_not_negative CHECK (amount_cents >= 0),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  CONSTRAINT payments_provider_check CHECK (provider IN ('mock', 'manual', 'stripe'))
);
-- The same payment reference can never be processed twice.
CREATE UNIQUE INDEX payments_provider_reference_unique
  ON payments (provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
CREATE INDEX payments_business_created_idx ON payments (business_id, created_at DESC);
CREATE INDEX payments_status_idx ON payments (status);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS subscription_plans;
