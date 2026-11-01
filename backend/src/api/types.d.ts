import type { AuthenticatedUser } from '../models/dto/user.dto';

// Adds `req.user` to Express requests. It is set by the `authenticate` middleware.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
