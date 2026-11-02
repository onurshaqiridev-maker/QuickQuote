/**
 * Login sessions are signed tokens (JWT) kept in an httpOnly cookie.
 * A token says WHO is logged in and WHEN the session started ("iat"). It cannot be changed
 * without JWT_SECRET. Sessions that started before the last password change are refused.
 */
import jwt from 'jsonwebtoken';
import { env, sessionDays } from '../config/env';
import type { User } from '../models/entities/user.entity';

export function signSessionToken(user: Pick<User, 'id' | 'role'>): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: sessionDays * 24 * 60 * 60,
    algorithm: 'HS256',
  });
}

/** Returns who the token belongs to and when it was issued, or null if it is invalid or expired. */
export function readSessionToken(token: string): { userId: string; issuedAt: Date } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || !payload.sub || typeof payload.iat !== 'number') return null;
    return { userId: payload.sub, issuedAt: new Date(payload.iat * 1000) };
  } catch {
    return null;
  }
}

/**
 * true if the session started before the password was last changed.
 * Token times are whole seconds, so the change time is rounded down to whole seconds too.
 */
export function startedBeforePasswordChange(issuedAt: Date, passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false;
  return issuedAt.getTime() < Math.floor(passwordChangedAt.getTime() / 1000) * 1000;
}
