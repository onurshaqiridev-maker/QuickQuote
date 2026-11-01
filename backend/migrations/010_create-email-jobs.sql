-- Up Migration

-- The EMAIL QUEUE. API requests only INSERT rows here; the worker sends them through Resend.
CREATE TABLE email_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email            text NOT NULL,
  template            text NOT NULL,
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'pending',
  attempts            integer NOT NULL DEFAULT 0,
  max_attempts        integer NOT NULL DEFAULT 5,
  -- Do not try before this moment (used to wait between retries).
  run_at              timestamptz NOT NULL DEFAULT now(),
  -- Set while a worker is sending the job; an old lock (crashed worker) expires.
  locked_at           timestamptz,
  last_error          text,
  provider_message_id text,
  dedupe_key          text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_jobs_status_check CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT email_jobs_attempts_not_negative CHECK (attempts >= 0),
  -- At least 4 attempts = 1 try + at least 3 retries.
  CONSTRAINT email_jobs_max_attempts_check CHECK (max_attempts >= 4),
  CONSTRAINT email_jobs_dedupe_key_unique UNIQUE (dedupe_key)
);
-- Lets the worker find the next due jobs quickly.
CREATE INDEX email_jobs_status_run_at_idx ON email_jobs (status, run_at);
CREATE TRIGGER email_jobs_set_updated_at BEFORE UPDATE ON email_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS email_jobs;
