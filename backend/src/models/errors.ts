/**
 * Domain errors.
 *
 * Services throw these when a business rule is broken. Each error has a CODE
 * (e.g. "EMAIL_TAKEN") and a friendly message, but NO HTTP status:
 * the API layer's error handler decides which HTTP status each code becomes.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_TOKEN'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'EMAIL_NOT_VERIFIED'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'EMAIL_ALREADY_VERIFIED'
  | 'INVALID_STATUS_TRANSITION';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(details: ErrorDetail[], message = 'Some fields are not valid.') {
    super('VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'The requested item was not found.') {
    super('NOT_FOUND', message);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Please log in to continue.') {
    super('UNAUTHENTICATED', message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You are not allowed to do this.') {
    super('FORBIDDEN', message);
  }
}
