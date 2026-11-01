/**
 * Keeps the process running until the hosting platform asks it to stop (SIGTERM, or Ctrl+C = SIGINT).
 * Then it stops every component (API server, email worker), closes the database pool and exits.
 */
import { logger } from './config/logger';
import { closePool } from './data/db';

interface Component {
  stop(): Promise<void>;
}

export function runUntilShutdown(components: Component[]): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down...`);
    // If something hangs, exit anyway after 15 seconds.
    setTimeout(() => process.exit(1), 15_000).unref();
    try {
      await Promise.all(components.map((component) => component.stop()));
      await closePool();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
}
