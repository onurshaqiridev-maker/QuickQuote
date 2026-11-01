import type { NextFunction, Request, Response } from 'express';
import { UnauthenticatedError } from '../../models/errors';
import * as authService from '../../services/auth.service';
import { SESSION_COOKIE } from '../session-cookie';

/** Requires a valid login cookie. Puts the logged-in user on `req.user`. */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token === '') {
    throw new UnauthenticatedError();
  }
  req.user = await authService.authenticateSession(token);
  next();
}

/** Returns the logged-in user, for use in controllers behind `authenticate`. */
export function currentUser(req: Request) {
  if (!req.user) throw new UnauthenticatedError();
  return req.user;
}
