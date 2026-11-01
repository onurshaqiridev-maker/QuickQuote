import type { Request, Response } from 'express';
import * as healthService from '../../services/health.service';

/** GET /health - 200 when the app and database are fine, 503 when the database is unreachable. */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const report = await healthService.checkHealth();
  res.set('Cache-Control', 'no-store');
  res.status(report.status === 'ok' ? 200 : 503).json(report);
}
