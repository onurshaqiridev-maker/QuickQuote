import { Router } from 'express';
import * as categoryController from '../controllers/public/category.controller';
import * as configController from '../controllers/public/config.controller';
import * as contactController from '../controllers/public/contact.controller';
import * as discoveryController from '../controllers/public/discovery.controller';
import * as planController from '../controllers/public/plan.controller';
import { contactLimiter } from '../middleware/rate-limit';

/** Mounted at /api - no login needed. */
export const publicRoutes = Router();

publicRoutes.get('/config', configController.getConfig);
publicRoutes.get('/categories', categoryController.listCategories);
publicRoutes.get('/plans', planController.listPlans);
publicRoutes.get('/cities', discoveryController.listCities);
publicRoutes.get('/businesses', discoveryController.searchBusinesses);
publicRoutes.get('/businesses/:slug', discoveryController.getBusiness);
publicRoutes.post('/contact', contactLimiter, contactController.sendContactMessage);
