/**
 * The one place that talks HTTP to the backend.
 *
 * - Sends and receives JSON.
 * - `credentials: 'include'` makes the browser send the login cookie automatically.
 * - Turns error responses into an `ApiError` with the backend's code and message.
 */
import type { FieldErrorDetail } from '../types/api';

// Empty in development: Vite forwards /api to the backend (see vite.config.ts).
const BASE_URL: string = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: FieldErrorDetail[];

  constructor(code: string, message: string, status: number, details: FieldErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Validation errors as { fieldName: firstMessage }, ready to show under each form field. */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const detail of this.details) {
      errors[detail.field] ??= detail.message;
    }
    return errors;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Full address of a file served by the backend, e.g. "/uploads/businesses/1/logo.png". */
export function assetUrl(path: string | null): string | null {
  return path ? `${BASE_URL}${path}` : null;
}

export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  // Files are sent as FormData; the browser sets the right Content-Type itself.
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Please check your connection and try again.', 0);
  }

  if (response.status === 204) return undefined as T;

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (json as { error?: { code?: string; message?: string; details?: FieldErrorDetail[] } } | null)?.error;
    throw new ApiError(
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.details ?? [],
    );
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => apiRequest<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
  /** Upload a file (multipart/form-data). */
  upload: <T>(path: string, form: FormData) => apiRequest<T>('POST', path, form),
};

/** A readable message for any error (ApiError or something unexpected). */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
