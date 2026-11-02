-- Up Migration

-- When the password last changed. Login sessions created BEFORE this moment stop working,
-- so a password reset also logs out anyone who might have stolen the old password.
ALTER TABLE users ADD COLUMN password_changed_at timestamptz;

-- Down Migration

ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
