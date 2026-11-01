/**
 * Reusable validation rules for incoming requests.
 * The API layer checks every request against these before calling a service.
 */
import { z } from 'zod';

export const emailField = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Please enter a valid email address.' }).max(254, 'Email is too long.'));

export const passwordField = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const fullNameField = z
  .string({ error: 'Name is required.' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(100, 'Name must be at most 100 characters.');

/** Optional phone number. An empty string counts as "not given". */
export const optionalPhoneField = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{6,20}$/, 'Please enter a valid phone number (6-20 digits, spaces, +, -, brackets).')
    .optional(),
);

/** A valid IANA time zone name, e.g. "Europe/Berlin". */
export const timezoneField = z
  .string({ error: 'Time zone is required.' })
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Please choose a valid time zone, e.g. "Europe/Berlin".');

export const idParamsSchema = z.object({
  id: z.uuid({ error: 'Invalid id.' }),
});

export const pageQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};
