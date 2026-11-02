import type { PriceType, ReservationStatus } from '../enums';
import type { CustomerQuoteSummary } from './quote.response';

export interface SlotResponse {
  /** Exact moment, ISO in UTC */
  startsAt: string;
  /** "09:30" in the business's time zone */
  localTime: string;
}

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  service: { id: string; name: string; durationMinutes: number };
  slots: SlotResponse[];
}

export interface ReservationServiceInfo {
  id: string;
  name: string;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number;
}

/** A reservation as the customer sees it. */
export interface CustomerReservationResponse {
  id: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  service: ReservationServiceInfo;
  business: { slug: string; displayName: string; logoUrl: string | null; city: string | null; addressLine: string | null; phone: string | null };
  customerNotes: string | null;
  businessMessage: string | null;
  cancelledBy: 'customer' | 'business' | 'system' | null;
  canCancel: boolean;
  /** Last moment the customer can cancel online. */
  cancelDeadline: string;
  createdAt: string;
}

/** A reservation as the business sees it, with customer information. */
export interface BusinessReservationResponse {
  id: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  service: ReservationServiceInfo;
  customer: { name: string; email: string; phone: string | null; previousVisits: number };
  customerNotes: string | null;
  businessMessage: string | null;
  cancelledBy: 'customer' | 'business' | 'system' | null;
  canComplete: boolean;
  createdAt: string;
}

/** The reservation part of the customer overview. */
export interface CustomerReservationSummary {
  upcoming: CustomerReservationResponse[];
  counts: { upcoming: number; past: number; cancelled: number };
}

/** Customer overview page: reservations (as before, at the top level) plus quote requests. */
export interface CustomerOverviewResponse extends CustomerReservationSummary {
  quotes: CustomerQuoteSummary;
}
