import { Router } from 'express';
import * as accountController from '../controllers/account.controller';
import { authenticate } from '../middleware/authenticate';

/** Mounted at /api/account - any logged-in user. */
export const accountRoutes = Router();

accountRoutes.use(authenticate);
accountRoutes.put('/profile', accountController.updateProfile);
accountRoutes.post('/change-password', accountController.changePassword);
