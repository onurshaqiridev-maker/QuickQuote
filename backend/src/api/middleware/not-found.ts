import type { Request, Response } from 'express';

/** Any URL that no route matched. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No endpoint for ${req.method} ${req.path}` },
  });
}
