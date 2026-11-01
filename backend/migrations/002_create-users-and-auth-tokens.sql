-- Up Migration

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  password_hash     text NOT NULL,
  full_name         text NOT NULL,
  phone             text,
  role              text NOT NULL,
  status            text NOT NULL DEFAULT 'active',
  status_reason     text,
  email_verified_at timestamptz,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_full_name_length CHECK (char_length(full_name) BETWEEN 2 AND 100),
  CONSTRAINT users_role_check CHECK (role IN ('customer', 'business_owner', 'admin')),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'deactivated'))
);
CREATE INDEX users_role_status_idx ON users (role, status);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE auth_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_tokens_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT auth_tokens_purpose_check CHECK (purpose IN ('email_verification', 'password_reset'))
);
CREATE INDEX auth_tokens_user_id_idx ON auth_tokens (user_id);

-- Down Migration

DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS users;
