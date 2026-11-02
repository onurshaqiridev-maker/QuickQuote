import { Router } from 'express';
import * as reservationController from '../controllers/customer/reservation.controller';
import { authenticate } from '../middleware/authenticate';
import { perUserLimiter } from '../middleware/rate-limit';
import { requireRole, requireVerifiedEmail } from '../middleware/require-role';

/** Mounted at /api/customer - customers only. */
export const customerRoutes = Router();

customerRoutes.use(authenticate, requireRole('customer'));
customerRoutes.get('/overview', reservationController.getOverview);
customerRoutes.get('/reservations', reservationController.listReservations);
customerRoutes.post('/reservations', requireVerifiedEmail, perUserLimiter(60, 20), reservationController.createReservation);
customerRoutes.get('/reservations/:id', reservationController.getReservation);
customerRoutes.post('/reservations/:id/cancel', reservationController.cancelReservation);
