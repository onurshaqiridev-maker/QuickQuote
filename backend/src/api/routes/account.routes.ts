import { Router } from 'express';
import * as accountController from '../controllers/account.controller';
import { authenticate } from '../middleware/authenticate';
import { perUserLimiter } from '../middleware/rate-limit';

/** Mounted at /api/account - any logged-in user. */
export const accountRoutes = Router();

accountRoutes.use(authenticate);
accountRoutes.put('/profile', accountController.updateProfile);
// At most 10 tries per 15 minutes: a stolen session must not be usable to guess the current password.
accountRoutes.post('/change-password', perUserLimiter(15, 10), accountController.changePassword);
