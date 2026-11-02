import { z } from 'zod';
import { optionalPhoneField, pageQueryShape } from './common.requests';

/** Treats "" and null as "not given". */
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

/** An amount in cents (e.g. 4500 = 45.00 EUR). */
const centsField = z
  .number({ error: 'The amount must be a number.' })
  .int('The amount must be in whole cents.')
  .min(0, 'The amount cannot be negative.')
  .max(100_000_000, 'The amount is too high.');

export const createQuoteRequestSchema = z.object({
  businessId: z.uuid({ error: 'Unknown business.' }),
  /** Leave empty for a general request. */
  serviceId: z.preprocess(emptyToUndefined, z.uuid({ error: 'Unknown service.' }).optional()),
  subject: z
    .string({ error: 'Subject is required.' })
    .trim()
    .min(3, 'The subject must be at least 3 characters.')
    .max(150, 'The subject must be at most 150 characters.'),
  description: z
    .string({ error: 'Please describe what you need.' })
    .trim()
    .min(10, 'Please describe what you need in at least 10 characters.')
    .max(3000, 'The description must be at most 3000 characters.'),
  preferredDate: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD.').optional(),
  ),
  budgetCents: z.preprocess(emptyToUndefined, centsField.optional()),
  phone: optionalPhoneField,
});
export type CreateQuoteRequestInput = z.infer<typeof createQuoteRequestSchema>;

/** The business sends its quote: a message (required) and a price (optional, e.g. when it depends on a visit). */
export const respondToQuoteSchema = z.object({
  message: z
    .string({ error: 'Please write a message for the customer.' })
    .trim()
    .min(1, 'Please write a message for the customer.')
    .max(3000, 'The message must be at most 3000 characters.'),
  quotedPriceCents: z.preprocess(emptyToUndefined, centsField.optional()),
});
export type RespondToQuoteInput = z.infer<typeof respondToQuoteSchema>;

/** Optional message when the business declines a request. */
export const quoteMessageSchema = z.object({
  message: z.preprocess(emptyToUndefined, z.string().trim().max(3000, 'The message must be at most 3000 characters.').optional()),
});

export const customerQuotesQuerySchema = z.object({
  tab: z.enum(['all', 'open', 'answered', 'declined']).default('all'),
  ...pageQueryShape,
});
export type CustomerQuotesQuery = z.infer<typeof customerQuotesQuerySchema>;

export const businessQuotesQuerySchema = z.object({
  tab: z.enum(['new', 'in_progress', 'answered', 'declined']).default('new'),
  ...pageQueryShape,
});
export type BusinessQuotesQuery = z.infer<typeof businessQuotesQuerySchema>;
