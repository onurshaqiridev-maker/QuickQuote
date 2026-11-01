/**
 * Request validation (API layer).
 * Checks incoming data against a Zod schema from models/requests and returns the clean,
 * typed result - or throws a VALIDATION_ERROR listing every problem.
 */
import type { z } from 'zod';
import { ValidationError } from '../models/errors';

export function parseRequest<Schema extends z.ZodType>(schema: Schema, data: unknown): z.infer<Schema> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    );
  }
  return result.data;
}
