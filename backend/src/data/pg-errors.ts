/**
 * Helpers to recognise PostgreSQL errors, so repositories can turn them into
 * friendly domain errors (e.g. "unique violation on users.email" -> EMAIL_TAKEN).
 * Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  EXCLUSION_VIOLATION: '23P01',
} as const;

interface PgError {
  code?: string;
  constraint?: string;
}

/** True when `error` is a PostgreSQL error with this code (and, if given, this constraint name). */
export function isPgError(error: unknown, code: string, constraint?: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const pgError = error as PgError;
  return pgError.code === code && (constraint === undefined || pgError.constraint === constraint);
}
