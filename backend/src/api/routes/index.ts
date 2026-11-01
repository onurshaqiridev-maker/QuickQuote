import { Router } from 'express';
import { accountRoutes } from './account.routes';
import { adminRoutes } from './admin.routes';
import { authRoutes } from './auth.routes';
import { publicRoutes } from './public.routes';

/** Every /api route. */
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/account', accountRoutes);
apiRoutes.use('/admin', adminRoutes);
apiRoutes.use('/', publicRoutes);
