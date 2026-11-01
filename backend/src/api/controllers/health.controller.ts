import type { Request, Response } from 'express';
import * as healthService from '../../services/health.service';

/** GET /health - 200 when the app and database are fine, 503 when the database is unreachable. */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const report = await healthService.checkHealth();
  res.set('Cache-Control', 'no-store');
  res.status(report.status === 'ok' ? 200 : 503).json(report);
}

/** GET / - a friendly hint for anyone who opens the API address in a browser. */
export function getApiInfo(_req: Request, res: Response): void {
  res.json({
    name: 'Quick Quote API',
    status: 'running',
    health: '/health',
    docs: 'https://github.com/onurshaqiridev-maker/QuickQuote#readme',
  });
}
