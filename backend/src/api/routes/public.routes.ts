import { Router } from 'express';
import * as categoryController from '../controllers/public/category.controller';
import * as contactController from '../controllers/public/contact.controller';
import * as planController from '../controllers/public/plan.controller';
import { contactLimiter } from '../middleware/rate-limit';

/** Mounted at /api - no login needed. */
export const publicRoutes = Router();

publicRoutes.get('/categories', categoryController.listCategories);
publicRoutes.get('/plans', planController.listPlans);
publicRoutes.post('/contact', contactLimiter, contactController.sendContactMessage);
