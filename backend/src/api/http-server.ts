import { env } from '../config/env';
import { logger } from '../config/logger';
import { createApp } from './app';

/** Starts the HTTP server on PORT. Returns a handle to stop it gracefully. */
export function startHttpServer() {
  const server = createApp().listen(env.PORT, () => {
    logger.info(`API server listening on http://localhost:${env.PORT}  (health: /health)`);
  });
  return {
    name: 'api',
    stop: () =>
      new Promise<void>((resolve) => {
        // Stop accepting new connections; finish the requests that are running.
        server.close(() => resolve());
      }),
  };
}
