import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../config/logger';

/** Logs one line per request: method, path, status and duration (never bodies, cookies or passwords). */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    const entry = { method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(durationMs) };
    // Health checks arrive every minute from the monitor - keep them out of the normal log.
    if (req.path === '/health') logger.debug(entry, 'request');
    else logger.info(entry, 'request');
  });
  next();
}
