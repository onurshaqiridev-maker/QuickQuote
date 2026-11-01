import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { emailLinkLimiter, loginLimiter, registerLimiter } from '../middleware/rate-limit';

/** Mounted at /api/auth */
export const authRoutes = Router();

authRoutes.post('/register/customer', registerLimiter, authController.registerCustomer);
authRoutes.post('/register/business', registerLimiter, authController.registerBusiness);
authRoutes.post('/login', loginLimiter, authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
authRoutes.post('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', emailLinkLimiter, authenticate, authController.resendVerification);
authRoutes.post('/forgot-password', emailLinkLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', emailLinkLimiter, authController.resetPassword);
