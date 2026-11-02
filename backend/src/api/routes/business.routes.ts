import { Router } from 'express';
import * as offeringController from '../controllers/business/offering.controller';
import * as overviewController from '../controllers/business/overview.controller';
import * as profileController from '../controllers/business/profile.controller';
import * as quoteController from '../controllers/business/quote.controller';
import * as reservationController from '../controllers/business/reservation.controller';
import * as scheduleController from '../controllers/business/schedule.controller';
import { authenticate } from '../middleware/authenticate';
import { loadBusiness } from '../middleware/load-business';
import { requireRole } from '../middleware/require-role';
import { uploadImage } from '../middleware/upload';

/** Mounted at /api/business - business owners only, always acting on THEIR business. */
export const businessRoutes = Router();

businessRoutes.use(authenticate, requireRole('business_owner'), loadBusiness);

// Overview and booking settings
businessRoutes.get('/overview', overviewController.getOverview);
businessRoutes.get('/settings', overviewController.getSettings);
businessRoutes.put('/settings', overviewController.updateSettings);

// Profile, logo, categories, photos, publishing
businessRoutes.get('/profile', profileController.getProfile);
businessRoutes.put('/profile', profileController.updateProfile);
businessRoutes.post('/profile/logo', uploadImage, profileController.uploadLogo);
businessRoutes.delete('/profile/logo', profileController.removeLogo);
businessRoutes.post('/profile/publish', profileController.publish);
businessRoutes.post('/profile/unpublish', profileController.unpublish);
businessRoutes.put('/categories', profileController.setCategories);
businessRoutes.post('/photos', uploadImage, profileController.addPhoto);
businessRoutes.put('/photos/order', profileController.reorderPhotos);
businessRoutes.delete('/photos/:id', profileController.deletePhoto);

// Services (offerings)
businessRoutes.get('/services', offeringController.listServices);
businessRoutes.post('/services', offeringController.createService);
businessRoutes.put('/services/:id', offeringController.updateService);
businessRoutes.delete('/services/:id', offeringController.archiveService);

// Working hours and blocked times
businessRoutes.get('/working-hours', scheduleController.getWorkingHours);
businessRoutes.put('/working-hours', scheduleController.replaceWorkingHours);
businessRoutes.get('/blocked-times', scheduleController.listBlockedTimes);
businessRoutes.post('/blocked-times', scheduleController.addBlockedTime);
businessRoutes.delete('/blocked-times/:id', scheduleController.deleteBlockedTime);

// Reservations
businessRoutes.get('/reservations', reservationController.listReservations);
businessRoutes.get('/reservations/:id', reservationController.getReservation);
businessRoutes.post('/reservations/:id/confirm', reservationController.confirm);
businessRoutes.post('/reservations/:id/reject', reservationController.reject);
businessRoutes.post('/reservations/:id/cancel', reservationController.cancel);
businessRoutes.post('/reservations/:id/complete', reservationController.complete);

// Quote requests
businessRoutes.get('/quote-requests', quoteController.listQuotes);
businessRoutes.get('/quote-requests/:id', quoteController.getQuote);
businessRoutes.post('/quote-requests/:id/start', quoteController.start);
businessRoutes.post('/quote-requests/:id/respond', quoteController.respond);
businessRoutes.post('/quote-requests/:id/reject', quoteController.reject);
