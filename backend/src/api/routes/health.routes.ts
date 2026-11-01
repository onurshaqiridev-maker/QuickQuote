import { Router } from 'express';
import * as healthController from '../controllers/health.controller';

export const healthRoutes = Router();

healthRoutes.get('/health', healthController.getHealth);
