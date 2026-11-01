import { env } from '../config/env';
import * as healthRepository from '../data/repositories/health.repository';
import type { HealthResponse } from '../models/responses/health.response';

/**
 * Checks the application and its database.
 * The API layer turns `status` into an HTTP status (200 or 503) - this service knows nothing about HTTP.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const databaseReachable = await healthRepository.ping(env.HEALTH_DB_TIMEOUT_MS);
  return {
    status: databaseReachable ? 'ok' : 'error',
    checks: {
      app: 'ok',
      database: databaseReachable ? 'ok' : 'unreachable',
    },
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
