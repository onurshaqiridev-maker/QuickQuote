import { Router } from 'express';
import * as businessController from '../controllers/admin/business.controller';
import * as emailJobController from '../controllers/admin/email-job.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/require-role';

/** Mounted at /api/admin - administrators only. */
export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRole('admin'));
adminRoutes.get('/email-jobs', emailJobController.listEmailJobs);
adminRoutes.get('/email-jobs/stats', emailJobController.getEmailQueueStats);
adminRoutes.post('/email-jobs/:id/retry', emailJobController.retryEmailJob);

// Businesses: review, approve, suspend, deactivate, reactivate
adminRoutes.get('/businesses', businessController.listBusinesses);
adminRoutes.get('/businesses/:id', businessController.getBusiness);
adminRoutes.post('/businesses/:id/approve', businessController.approve);
adminRoutes.post('/businesses/:id/suspend', businessController.suspend);
adminRoutes.post('/businesses/:id/deactivate', businessController.deactivate);
adminRoutes.post('/businesses/:id/reactivate', businessController.reactivate);
