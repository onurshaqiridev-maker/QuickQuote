import { z } from 'zod';
import { BUSINESS_STATUSES, CATEGORY_ICONS, QUOTE_STATUSES, RESERVATION_STATUSES, USER_ROLES, USER_STATUSES } from '../enums';
import { pageQueryShape } from './common.requests';

export const listBusinessesQuerySchema = z.object({
  status: z.enum(BUSINESS_STATUSES, { error: 'Unknown status.' }).optional(),
  search: z.string().trim().max(100).optional(),
  ...pageQueryShape,
});
export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;

/** Suspending or deactivating needs a reason: the owner is told why. */
export const statusReasonSchema = z.object({
  reason: z
    .string({ error: 'Please give a reason.' })
    .trim()
    .min(3, 'Please give a reason (at least 3 characters).')
    .max(500, 'The reason must be at most 500 characters.'),
});
export type StatusReasonRequest = z.infer<typeof statusReasonSchema>;

/** Turns "" into "not given", so empty filter fields in a URL are simply ignored. */
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);
const searchField = z.preprocess(emptyToUndefined, z.string().trim().max(100).optional());
const dateField = z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD.').optional());

export const activityQuerySchema = z.object({ ...pageQueryShape });

export const listUsersQuerySchema = z.object({
  role: z.preprocess(emptyToUndefined, z.enum(USER_ROLES, { error: 'Unknown role.' }).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(USER_STATUSES, { error: 'Unknown status.' }).optional()),
  search: searchField,
  ...pageQueryShape,
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/** All reservations. `search` matches the business, the customer's name or email, or the service. Dates are the appointment day (UTC). */
export const adminReservationsQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(RESERVATION_STATUSES, { error: 'Unknown status.' }).optional()),
  search: searchField,
  from: dateField,
  to: dateField,
  ...pageQueryShape,
});
export type AdminReservationsQuery = z.infer<typeof adminReservationsQuerySchema>;

/** All quote requests. `search` matches the business, the customer's name or email, or the subject. */
export const adminQuotesQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(QUOTE_STATUSES, { error: 'Unknown status.' }).optional()),
  search: searchField,
  ...pageQueryShape,
});
export type AdminQuotesQuery = z.infer<typeof adminQuotesQuerySchema>;

/** Create or edit a category. Leave `slug` empty to make one from the name. */
export const categoryInputSchema = z.object({
  name: z.string({ error: 'Name is required.' }).trim().min(2, 'The name must be at least 2 characters.').max(60, 'The name must be at most 60 characters.'),
  slug: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(60, 'The address name must be at most 60 characters.')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use small letters, numbers and single dashes, e.g. "pet-care".')
      .optional(),
  ),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(300, 'The description must be at most 300 characters.').optional()),
  icon: z.preprocess(emptyToUndefined, z.enum(CATEGORY_ICONS, { error: 'Choose one of the icons.' }).optional()),
  sortOrder: z.number({ error: 'The position must be a number.' }).int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
