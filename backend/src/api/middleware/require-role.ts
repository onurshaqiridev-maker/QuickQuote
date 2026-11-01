import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../../models/enums';
import { DomainError, ForbiddenError, UnauthenticatedError } from '../../models/errors';

/** Only lets users with one of these roles through. Use after `authenticate`. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthenticatedError();
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}

/** Only lets users with a confirmed email through. Use after `authenticate`. */
export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new UnauthenticatedError();
  if (!req.user.emailVerified) {
    throw new DomainError('EMAIL_NOT_VERIFIED', 'Please confirm your email address first.');
  }
  next();
}
