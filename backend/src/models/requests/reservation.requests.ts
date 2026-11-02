import { z } from 'zod';
import { optionalPhoneField, pageQueryShape } from './common.requests';

export const availabilityQuerySchema = z.object({
  serviceId: z.uuid({ error: 'Choose a service.' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD.'),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const createReservationSchema = z.object({
  businessId: z.uuid({ error: 'Unknown business.' }),
  serviceId: z.uuid({ error: 'Choose a service.' }),
  startsAt: z.iso.datetime({ offset: true, error: 'Choose a time.' }),
  notes: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(1000, 'Notes must be at most 1000 characters.').optional(),
  ),
  phone: optionalPhoneField,
});
export type CreateReservationRequest = z.infer<typeof createReservationSchema>;

/** Optional message from the business (rejecting or cancelling) or reason from the customer. */
export const reservationMessageSchema = z.object({
  message: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(1000, 'The message must be at most 1000 characters.').optional(),
  ),
});
export type ReservationMessageRequest = z.infer<typeof reservationMessageSchema>;

export const customerReservationsQuerySchema = z.object({
  tab: z.enum(['upcoming', 'past', 'cancelled']).default('upcoming'),
  ...pageQueryShape,
});
export type CustomerReservationsQuery = z.infer<typeof customerReservationsQuerySchema>;

export const businessReservationsQuerySchema = z.object({
  tab: z.enum(['pending', 'upcoming', 'past', 'all']).default('upcoming'),
  ...pageQueryShape,
});
export type BusinessReservationsQuery = z.infer<typeof businessReservationsQuerySchema>;
