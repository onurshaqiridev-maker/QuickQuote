import type { AuthenticatedUser } from '../models/dto/user.dto';

// Adds `req.user` and `req.businessId` to Express requests (set by middleware).
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** The logged-in owner's business. Set by the `loadBusiness` middleware. */
      businessId?: string;
    }
  }
}

export {};
