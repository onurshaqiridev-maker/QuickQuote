import { z } from 'zod';
import { BUSINESS_STATUSES } from '../enums';
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
