-- Up Migration

CREATE TABLE activity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,  -- NULL = the system
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_created_idx ON activity_logs (created_at DESC);

-- Down Migration

DROP TABLE IF EXISTS activity_logs;
