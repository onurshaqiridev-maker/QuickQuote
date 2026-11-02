/**
 * Builds the Express application: security headers, CORS, JSON parsing, cookies,
 * logging, routes and error handling. `server.ts` starts it; tests use it directly.
 */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';
import { uploadDirectory } from '../services/storage.service';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { generalLimiter } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { apiRoutes } from './routes';
import * as healthController from './controllers/health.controller';
import { healthRoutes } from './routes/health.routes';
import { serveWebsite } from './website';

export interface AppOptions {
  /** Folder of the built website to serve as well (production). Defaults to FRONTEND_DIST_DIR. */
  websiteDir?: string;
}

export function createApp(options: AppOptions = {}): Express {
  const websiteDir = options.websiteDir ?? env.FRONTEND_DIST_DIR;
  const app = express();

  // Hosting platforms put a proxy in front of the app; trust it so client IPs are correct (rate limits).
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Health check first: no rate limit, no login.
  app.use(healthRoutes);

  // Uploaded logos and photos. Other websites (our frontend) may show them in <img> tags.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(uploadDirectory(), { index: false, dotfiles: 'ignore', maxAge: '7d' }),
  );

  app.use('/api', generalLimiter, apiRoutes);

  // The home address "/": the website when it is served from here, otherwise short API information.
  if (websiteDir) serveWebsite(app, websiteDir);
  else app.get('/', healthController.getApiInfo);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
