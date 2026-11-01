/** Validation rules for the business dashboard (profile, services, schedule, settings). */
import { z } from 'zod';
import { PRICE_TYPES } from '../enums';
import { optionalPhoneField, timezoneField } from './common.requests';

/** Optional text: "" and null both mean "empty". */
function optionalText(max: number, label: string) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max, `${label} must be at most ${max} characters.`).optional(),
  );
}

export const updateBusinessProfileSchema = z.object({
  displayName: z
    .string({ error: 'Business name is required.' })
    .trim()
    .min(2, 'Business name must be at least 2 characters.')
    .max(100, 'Business name must be at most 100 characters.'),
  description: optionalText(2000, 'Description'),
  contactEmail: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().toLowerCase().pipe(z.email({ error: 'Please enter a valid email address.' })).optional(),
  ),
  contactPhone: optionalPhoneField,
  websiteUrl: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z
      .string()
      .trim()
      .max(300)
      .pipe(z.url({ protocol: /^https?$/, error: 'Please enter a full web address, e.g. https://example.com' }))
      .optional(),
  ),
  addressLine: optionalText(200, 'Address'),
  city: optionalText(100, 'City'),
  postalCode: optionalText(20, 'Postal code'),
  country: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Use the 2-letter country code, e.g. DE or AL.')
      .optional(),
  ),
});
export type UpdateBusinessProfileRequest = z.infer<typeof updateBusinessProfileSchema>;

export const setCategoriesSchema = z.object({
  categoryIds: z
    .array(z.uuid({ error: 'Invalid category id.' }), { error: 'Choose 1 to 3 categories.' })
    .min(1, 'Choose at least 1 category.')
    .max(3, 'Choose at most 3 categories.')
    .refine((ids) => new Set(ids).size === ids.length, 'Each category can only be chosen once.'),
});
export type SetCategoriesRequest = z.infer<typeof setCategoriesSchema>;

export const photoUploadSchema = z.object({
  caption: optionalText(200, 'Caption'),
});

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.uuid({ error: 'Invalid photo id.' })).max(100),
});
export type ReorderPhotosRequest = z.infer<typeof reorderPhotosSchema>;

export const offeringSchema = z
  .object({
    name: z
      .string({ error: 'Name is required.' })
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(100, 'Name must be at most 100 characters.'),
    description: optionalText(1000, 'Description'),
    priceType: z.enum(PRICE_TYPES, { error: 'Choose fixed, starting from, or on request.' }),
    priceCents: z
      .number({ error: 'Price must be a number.' })
      .int('Price must be in whole cents.')
      .min(0, 'Price cannot be negative.')
      .max(100_000_000, 'Price is too high.')
      .nullable()
      .optional(),
    durationMinutes: z
      .number({ error: 'Duration must be a number.' })
      .int()
      .min(5, 'Duration must be at least 5 minutes.')
      .max(480, 'Duration must be at most 8 hours.')
      .nullable()
      .optional(),
    isBookable: z.boolean().default(true),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.priceType !== 'on_request' && (value.priceCents === null || value.priceCents === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['priceCents'], message: 'Enter a price (or choose "price on request").' });
    }
    if (value.isBookable && (value.durationMinutes === null || value.durationMinutes === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'Services that can be booked online need a duration.' });
    }
  });
export type OfferingRequest = z.infer<typeof offeringSchema>;

const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the 24-hour format HH:MM, e.g. 09:00.');

export const workingHoursSchema = z.object({
  ranges: z
    .array(
      z
        .object({
          dayOfWeek: z.number().int().min(1).max(7),
          startTime: timeField,
          endTime: timeField,
        })
        .refine((range) => range.endTime > range.startTime, {
          message: 'The closing time must be after the opening time.',
          path: ['endTime'],
        }),
    )
    .max(50, 'Too many time ranges.'),
});
export type WorkingHoursRequest = z.infer<typeof workingHoursSchema>;

export const blockedTimeSchema = z
  .object({
    startsAt: z.iso.datetime({ offset: true, error: 'Start must be a valid date and time.' }),
    endsAt: z.iso.datetime({ offset: true, error: 'End must be a valid date and time.' }),
    reason: optionalText(200, 'Reason'),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: 'The end must be after the start.',
    path: ['endsAt'],
  })
  .refine((value) => new Date(value.endsAt) > new Date(), {
    message: 'This period is already over.',
    path: ['endsAt'],
  });
export type BlockedTimeRequest = z.infer<typeof blockedTimeSchema>;

export const SLOT_INTERVALS = [10, 15, 20, 30, 45, 60] as const;

export const bookingSettingsSchema = z.object({
  timezone: timezoneField,
  slotIntervalMinutes: z
    .number()
    .int()
    .refine((value) => (SLOT_INTERVALS as readonly number[]).includes(value), 'Choose 10, 15, 20, 30, 45 or 60 minutes.'),
  minNoticeHours: z.number().int().min(0, 'Cannot be negative.').max(168, 'At most 168 hours (7 days).'),
  maxAdvanceDays: z.number().int().min(1, 'At least 1 day.').max(365, 'At most 365 days.'),
  cancellationNoticeHours: z.number().int().min(0, 'Cannot be negative.').max(168, 'At most 168 hours (7 days).'),
});
export type BookingSettingsRequest = z.infer<typeof bookingSettingsSchema>;
