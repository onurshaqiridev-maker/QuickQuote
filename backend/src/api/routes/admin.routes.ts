import { Router } from 'express';
import * as emailJobController from '../controllers/admin/email-job.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/require-role';

/** Mounted at /api/admin - administrators only. */
export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRole('admin'));
adminRoutes.get('/email-jobs', emailJobController.listEmailJobs);
adminRoutes.get('/email-jobs/stats', emailJobController.getEmailQueueStats);
adminRoutes.post('/email-jobs/:id/retry', emailJobController.retryEmailJob);
