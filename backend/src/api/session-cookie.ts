/** The login cookie. Setting and clearing cookies is an HTTP concern, so it lives in the API layer. */
import type { Response } from 'express';
import { env, sessionDays } from '../config/env';

export const SESSION_COOKIE = 'qq_session';

const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read it
  secure: env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // not sent along when other websites submit forms to us
  path: '/',
};

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: sessionDays * 24 * 60 * 60 * 1000 });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}
