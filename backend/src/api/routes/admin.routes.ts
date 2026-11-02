import { Router } from 'express';
import * as businessController from '../controllers/admin/business.controller';
import * as categoryController from '../controllers/admin/category.controller';
import * as emailJobController from '../controllers/admin/email-job.controller';
import * as overviewController from '../controllers/admin/overview.controller';
import * as recordController from '../controllers/admin/record.controller';
import * as userController from '../controllers/admin/user.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/require-role';

/** Mounted at /api/admin - administrators only. */
export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRole('admin'));

// Overview: numbers and the activity feed
adminRoutes.get('/stats', overviewController.getStats);
adminRoutes.get('/activity', overviewController.listActivity);

// Email queue monitor
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

// Users (customers, business owners, admins): list, details, suspend, reactivate
adminRoutes.get('/users', userController.listUsers);
adminRoutes.get('/users/:id', userController.getUser);
adminRoutes.post('/users/:id/suspend', userController.suspend);
adminRoutes.post('/users/:id/reactivate', userController.reactivate);

// Reservations and quote requests (read-only)
adminRoutes.get('/reservations', recordController.listReservations);
adminRoutes.get('/quote-requests', recordController.listQuoteRequests);

// Categories
adminRoutes.get('/categories', categoryController.listCategories);
adminRoutes.post('/categories', categoryController.createCategory);
adminRoutes.put('/categories/:id', categoryController.updateCategory);
adminRoutes.delete('/categories/:id', categoryController.deleteCategory);
