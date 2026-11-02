import type { PriceType, ReservationStatus } from '../enums';

/** One row of the `reservations` table. */
export interface Reservation {
  id: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  priceType: PriceType;
  priceCents: number | null;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  customerNotes: string | null;
  customerPhone: string | null;
  businessMessage: string | null;
  cancelledBy: 'customer' | 'business' | 'system' | null;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A reservation together with what the customer and business pages need to show it. */
export interface ReservationDetails extends Reservation {
  businessSlug: string;
  businessName: string;
  businessLogoUrl: string | null;
  businessCity: string | null;
  businessAddressLine: string | null;
  businessPhone: string | null;
  businessEmail: string;
  businessTimezone: string;
  cancellationNoticeHours: number;
  durationMinutes: number;
  customerName: string;
  customerEmail: string;
  customerAccountPhone: string | null;
  /** Completed visits of this customer at this business. */
  customerVisits: number;
}
