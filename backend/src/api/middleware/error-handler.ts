/**
 * Turns every error into a consistent JSON response.
 *
 * Services throw domain errors with a CODE; this is the one place that decides
 * which HTTP status each code becomes. Unknown errors become a 500 without details
 * (the details only go to the server log).
 */
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { logger } from '../../config/logger';
import { DomainError, type ErrorCode } from '../../models/errors';

const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_TOKEN: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  EMAIL_NOT_VERIFIED: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  EMAIL_ALREADY_VERIFIED: 409,
  INVALID_STATUS_TRANSITION: 409,
  PLAN_LIMIT_REACHED: 403,
  GO_LIVE_REQUIREMENTS_NOT_MET: 409,
};

/** Errors created by Express's JSON body parser (e.g. invalid JSON). */
interface BodyParserError {
  type?: string;
  status?: number;
}

// Express recognises error handlers by their 4 arguments, so `_next` must stay.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof DomainError) {
    res.status(HTTP_STATUS_BY_CODE[error.code]).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  // File upload problems (too big, too many files, wrong field name).
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE' ? 'The image must be 5 MB or smaller.' : 'Please upload one image in the "file" field.';
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message, details: [{ field: 'file', message }] } });
    return;
  }

  const bodyError = error as BodyParserError;
  if (bodyError?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'The request body is not valid JSON.' } });
    return;
  }
  if (bodyError?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'The request body is too large.' } });
    return;
  }

  logger.error({ err: error, method: req.method, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again later.' },
  });
}
