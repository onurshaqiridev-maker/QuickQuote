import type { AuthTokenPurpose } from '../../models/enums';
import type { AuthToken } from '../../models/entities/auth-token.entity';
import { pool, type Queryable } from '../db';

interface AuthTokenRow {
  id: string;
  user_id: string;
  purpose: AuthTokenPurpose;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

function toAuthToken(row: AuthTokenRow): AuthToken {
  return {
    id: row.id,
    userId: row.user_id,
    purpose: row.purpose,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

export async function insert(
  token: { userId: string; purpose: AuthTokenPurpose; tokenHash: string; expiresAt: Date },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    'INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [token.userId, token.purpose, token.tokenHash, token.expiresAt],
  );
}

/**
 * Uses a token: marks it as used and returns it - but only if it exists, has the right purpose,
 * is not expired and was not used before. Doing this in ONE update makes double use impossible.
 */
export async function consume(
  tokenHash: string,
  purpose: AuthTokenPurpose,
  db: Queryable = pool,
): Promise<AuthToken | null> {
  const result = await db.query<AuthTokenRow>(
    `UPDATE auth_tokens
        SET used_at = now()
      WHERE token_hash = $1
        AND purpose = $2
        AND used_at IS NULL
        AND expires_at > now()
      RETURNING *`,
    [tokenHash, purpose],
  );
  return result.rows[0] ? toAuthToken(result.rows[0]) : null;
}

/** Makes all unused tokens of one purpose unusable (e.g. after the password was reset). */
export async function invalidateUnused(userId: string, purpose: AuthTokenPurpose, db: Queryable = pool): Promise<void> {
  await db.query(
    'UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
    [userId, purpose],
  );
}
