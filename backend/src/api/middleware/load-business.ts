import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../../models/errors';
import * as businessService from '../../services/business.service';
import { currentUser } from './authenticate';

/**
 * For business routes: finds the business owned by the logged-in user and puts its id on
 * `req.businessId`. Business URLs never contain a business id, so nobody can act on
 * another business by changing the URL.
 */
export async function loadBusiness(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.businessId = await businessService.getBusinessIdForOwner(currentUser(req).id);
  next();
}

export function currentBusinessId(req: Request): string {
  if (!req.businessId) throw new ForbiddenError('This account has no business.');
  return req.businessId;
}
