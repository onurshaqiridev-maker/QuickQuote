import type { AuthTokenPurpose } from '../enums';

/** One row of the `auth_tokens` table (email confirmation / password reset links). */
export interface AuthToken {
  id: string;
  userId: string;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
