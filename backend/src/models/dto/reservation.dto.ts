import type { PriceType } from '../enums';

/** A time range in exact moments (used to block slots). */
export interface TimeRange {
  start: Date;
  end: Date;
}

/** Everything the slot calculation needs. */
export interface SlotCalculationInput {
  /** "YYYY-MM-DD", in the business's time zone */
  date: string;
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  durationMinutes: number;
  /** Opening ranges for that weekday, local "HH:MM" */
  ranges: { startTime: string; endTime: string }[];
  /** Pending/confirmed reservations and blocked times */
  busy: TimeRange[];
  now: Date;
}

export interface NewReservation {
  businessId: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  priceType: PriceType;
  priceCents: number | null;
  startsAt: Date;
  endsAt: Date;
  customerNotes: string | null;
  customerPhone: string | null;
}

export type CustomerReservationTab = 'upcoming' | 'past' | 'cancelled';
export type BusinessReservationTab = 'pending' | 'upcoming' | 'past' | 'all';
