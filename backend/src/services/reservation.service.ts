/**
 * Reservations: booking, the business's decisions and customer cancellation.
 * Status flow (docs/USER_FLOWS.md 4.3):
 *   pending -> confirmed | rejected | cancelled
 *   confirmed -> cancelled | completed
 */
import { DateTime } from 'luxon';
import { env } from '../config/env';
import { withTransaction, type Transaction } from '../data/db';
import * as publicBusinessRepository from '../data/repositories/public-business.repository';
import * as reservationRepository from '../data/repositories/reservation.repository';
import type { EmailTemplateName, ReservationEmailData } from '../models/dto/email.dto';
import type { Page } from '../models/dto/page.dto';
import type { AuthenticatedUser } from '../models/dto/user.dto';
import type { ReservationDetails } from '../models/entities/reservation.entity';
import type { ReservationStatus } from '../models/enums';
import { DomainError, NotFoundError } from '../models/errors';
import type {
  BusinessReservationsQuery,
  CreateReservationRequest,
  CustomerReservationsQuery,
} from '../models/requests/reservation.requests';
import type {
  BusinessReservationResponse,
  CustomerReservationSummary,
  CustomerReservationResponse,
} from '../models/responses/reservation.response';
import { logActivity } from './activity.service';
import { findBookableService, slotsFor } from './availability.service';
import { enqueueEmail } from './email/email-queue.service';
import { formatEuros } from './formatting';

const link = (path: string) => new URL(path, env.FRONTEND_URL).toString();

// ---------------------------------------------------------------------------
// Turning rows into responses
// ---------------------------------------------------------------------------

function cancelDeadline(r: ReservationDetails): Date {
  return new Date(r.startsAt.getTime() - r.cancellationNoticeHours * 3_600_000);
}

function serviceInfo(r: ReservationDetails) {
  return { id: r.serviceId, name: r.serviceName, priceType: r.priceType, priceCents: r.priceCents, durationMinutes: r.durationMinutes };
}

export function toCustomerResponse(r: ReservationDetails, now = new Date()): CustomerReservationResponse {
  return {
    id: r.id,
    status: r.status,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    timezone: r.businessTimezone,
    service: serviceInfo(r),
    business: { slug: r.businessSlug, displayName: r.businessName, logoUrl: r.businessLogoUrl, city: r.businessCity, addressLine: r.businessAddressLine, phone: r.businessPhone },
    customerNotes: r.customerNotes,
    businessMessage: r.businessMessage,
    cancelledBy: r.cancelledBy,
    canCancel: (r.status === 'pending' || r.status === 'confirmed') && now <= cancelDeadline(r),
    cancelDeadline: cancelDeadline(r).toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

export function toBusinessResponse(r: ReservationDetails, now = new Date()): BusinessReservationResponse {
  return {
    id: r.id,
    status: r.status,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    timezone: r.businessTimezone,
    service: serviceInfo(r),
    customer: { name: r.customerName, email: r.customerEmail, phone: r.customerPhone ?? r.customerAccountPhone, previousVisits: r.customerVisits },
    customerNotes: r.customerNotes,
    businessMessage: r.businessMessage,
    cancelledBy: r.cancelledBy,
    canComplete: r.status === 'confirmed' && r.startsAt <= now,
    createdAt: r.createdAt.toISOString(),
  };
}

/** "Tuesday, 10 November 2026 at 09:30", in the business's time zone. */
export function formatWhen(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: timezone }).setLocale('en-GB').toFormat("cccc, d LLLL yyyy 'at' HH:mm");
}

function priceText(r: { priceType: string; priceCents: number | null }): string {
  if (r.priceType === 'on_request' || r.priceCents === null) return 'Price on request';
  if (r.priceCents === 0) return 'Free';
  const euros = formatEuros(r.priceCents);
  return r.priceType === 'starting_from' ? `from ${euros}` : euros;
}

function emailData(r: ReservationDetails): ReservationEmailData {
  return { businessName: r.businessName, serviceName: r.serviceName, when: formatWhen(r.startsAt, r.businessTimezone), price: priceText(r) };
}

async function loadDetails(id: string): Promise<ReservationDetails> {
  const details = await reservationRepository.findDetailsById(id);
  if (!details) throw new NotFoundError('Reservation not found.');
  return details;
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export async function createReservation(customer: AuthenticatedUser, input: CreateReservationRequest): Promise<CustomerReservationResponse> {
  const business = await publicBusinessRepository.findVisibleById(input.businessId, env.SUBSCRIPTIONS_REQUIRED);
  if (!business) throw new NotFoundError('This business is not accepting bookings right now.');
  const service = await findBookableService(business.id, input.serviceId);

  // The chosen time must be one of the free slots RIGHT NOW (working hours, interval, notice, not taken).
  const startsAt = new Date(input.startsAt);
  const date = DateTime.fromJSDate(startsAt, { zone: business.timezone }).toISODate() ?? '';
  const slots = await slotsFor(business, service, date);
  if (!slots.some((slot) => new Date(slot.startsAt).getTime() === startsAt.getTime())) {
    throw new DomainError('SLOT_UNAVAILABLE', 'Sorry, this time is not available any more. Please choose another time.');
  }

  const reservationId = await withTransaction(async (tx) => {
    // The database's no-overlap rule is the final guard if two people book at the same moment.
    const reservation = await reservationRepository.insert(
      {
        businessId: business.id,
        customerId: customer.id,
        serviceId: service.id,
        serviceName: service.name,
        priceType: service.priceType,
        priceCents: service.priceCents,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60_000),
        customerNotes: input.notes ?? null,
        customerPhone: input.phone ?? null,
      },
      tx,
    );
    const details = await reservationRepository.findDetailsById(reservation.id, tx);
    if (!details) throw new NotFoundError('Reservation not found.');

    await enqueueEmail(
      {
        to: details.businessEmail,
        template: 'reservation_new_business',
        payload: {
          ...emailData(details),
          customerName: details.customerName,
          customerEmail: details.customerEmail,
          customerPhone: details.customerPhone ?? details.customerAccountPhone,
          customerNotes: details.customerNotes,
          dashboardUrl: link('/dashboard/reservations'),
        },
      },
      tx,
    );
    await enqueueEmail(
      {
        to: details.customerEmail,
        template: 'reservation_received_customer',
        payload: { ...emailData(details), customerName: details.customerName, accountUrl: link('/account/reservations') },
      },
      tx,
    );
    await logActivity({ actorUserId: customer.id, action: 'reservation.created', entityType: 'reservation', entityId: reservation.id }, tx);
    return reservation.id;
  });

  return toCustomerResponse(await loadDetails(reservationId));
}

// ---------------------------------------------------------------------------
// Status changes
// ---------------------------------------------------------------------------

async function applyChange(
  details: ReservationDetails,
  change: { to: ReservationStatus; from: ReservationStatus[]; message?: string | null; cancelledBy?: 'customer' | 'business' | 'system' },
  actorUserId: string | null,
  email: (tx: Transaction) => Promise<void>,
): Promise<void> {
  await withTransaction(async (tx) => {
    const updated = await reservationRepository.changeStatus(details.id, change, tx);
    if (!updated) {
      throw new DomainError('INVALID_STATUS_TRANSITION', `This reservation is "${details.status}" and cannot be changed that way.`);
    }
    await email(tx);
    await logActivity({ actorUserId, action: `reservation.${change.to}`, entityType: 'reservation', entityId: details.id }, tx);
  });
}

function customerEmail<T extends EmailTemplateName>(details: ReservationDetails, template: T, extra: Record<string, unknown>, tx: Transaction) {
  return enqueueEmail(
    { to: details.customerEmail, template, payload: { ...emailData(details), customerName: details.customerName, ...extra } as never },
    tx,
  );
}

/** Loads a reservation of THIS business (another business's reservation looks like "not found"). */
async function loadForBusiness(businessId: string, id: string): Promise<ReservationDetails> {
  const details = await loadDetails(id);
  if (details.businessId !== businessId) throw new NotFoundError('Reservation not found.');
  return details;
}

export async function confirmReservation(businessId: string, id: string, actorUserId: string): Promise<BusinessReservationResponse> {
  const details = await loadForBusiness(businessId, id);
  await applyChange(details, { to: 'confirmed', from: ['pending'] }, actorUserId, (tx) =>
    customerEmail(details, 'reservation_confirmed_customer', {
      address: [details.businessAddressLine, details.businessCity].filter(Boolean).join(', ') || null,
      accountUrl: link('/account/reservations'),
    }, tx),
  );
  return toBusinessResponse(await loadDetails(id));
}

export async function rejectReservation(businessId: string, id: string, actorUserId: string, message: string | null): Promise<BusinessReservationResponse> {
  const details = await loadForBusiness(businessId, id);
  await applyChange(details, { to: 'rejected', from: ['pending'], message }, actorUserId, (tx) =>
    customerEmail(details, 'reservation_rejected_customer', { message, profileUrl: link(`/businesses/${details.businessSlug}`) }, tx),
  );
  return toBusinessResponse(await loadDetails(id));
}

export async function cancelByBusiness(businessId: string, id: string, actorUserId: string, message: string | null): Promise<BusinessReservationResponse> {
  const details = await loadForBusiness(businessId, id);
  await applyChange(details, { to: 'cancelled', from: ['pending', 'confirmed'], message, cancelledBy: 'business' }, actorUserId, (tx) =>
    customerEmail(details, 'reservation_cancelled_customer', { message, cancelledBy: 'business', profileUrl: link(`/businesses/${details.businessSlug}`) }, tx),
  );
  return toBusinessResponse(await loadDetails(id));
}

export async function completeReservation(businessId: string, id: string, actorUserId: string): Promise<BusinessReservationResponse> {
  const details = await loadForBusiness(businessId, id);
  if (details.startsAt > new Date()) {
    throw new DomainError('INVALID_STATUS_TRANSITION', 'An appointment can only be marked as completed after it has started.');
  }
  await applyChange(details, { to: 'completed', from: ['confirmed'] }, actorUserId, async () => undefined);
  return toBusinessResponse(await loadDetails(id));
}

export async function cancelByCustomer(customerId: string, id: string, reason: string | null): Promise<CustomerReservationResponse> {
  const details = await loadDetails(id);
  if (details.customerId !== customerId) throw new NotFoundError('Reservation not found.');
  if ((details.status === 'pending' || details.status === 'confirmed') && new Date() > cancelDeadline(details)) {
    throw new DomainError(
      'CANCELLATION_WINDOW_PASSED',
      `This reservation can no longer be cancelled online (the deadline was ${details.cancellationNoticeHours} hours before the start). Please contact the business directly.`,
    );
  }
  await applyChange(details, { to: 'cancelled', from: ['pending', 'confirmed'], cancelledBy: 'customer' }, customerId, (tx) =>
    enqueueEmail(
      {
        to: details.businessEmail,
        template: 'reservation_cancelled_business',
        payload: { ...emailData(details), customerName: details.customerName, message: reason, dashboardUrl: link('/dashboard/reservations') },
      },
      tx,
    ),
  );
  return toCustomerResponse(await loadDetails(id));
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listCustomerReservations(customerId: string, query: CustomerReservationsQuery): Promise<Page<CustomerReservationResponse>> {
  const page = await reservationRepository.listForCustomer(customerId, query.tab, query);
  const now = new Date();
  return { ...page, items: page.items.map((r) => toCustomerResponse(r, now)) };
}

export async function getCustomerReservation(customerId: string, id: string): Promise<CustomerReservationResponse> {
  const details = await loadDetails(id);
  if (details.customerId !== customerId) throw new NotFoundError('Reservation not found.');
  return toCustomerResponse(details);
}

/** For the customer overview: the next 3 appointments and the counts per tab. */
export async function getCustomerReservationSummary(customerId: string): Promise<CustomerReservationSummary> {
  const [upcoming, counts] = await Promise.all([
    reservationRepository.listForCustomer(customerId, 'upcoming', { page: 1, pageSize: 3 }),
    reservationRepository.countForCustomer(customerId),
  ]);
  const now = new Date();
  return { upcoming: upcoming.items.map((r) => toCustomerResponse(r, now)), counts };
}

export async function listBusinessReservations(businessId: string, query: BusinessReservationsQuery): Promise<Page<BusinessReservationResponse>> {
  const page = await reservationRepository.listForBusiness(businessId, query.tab, query);
  const now = new Date();
  return { ...page, items: page.items.map((r) => toBusinessResponse(r, now)) };
}

export async function getBusinessReservation(businessId: string, id: string): Promise<BusinessReservationResponse> {
  return toBusinessResponse(await loadForBusiness(businessId, id));
}

/** For the business overview: today's appointments (in the business's time zone) and pending count. */
export async function getBusinessToday(businessId: string, timezone: string) {
  const today = DateTime.now().setZone(timezone);
  const [items, pendingCount] = await Promise.all([
    reservationRepository.listForBusinessBetween(businessId, today.startOf('day').toJSDate(), today.endOf('day').toJSDate()),
    reservationRepository.countPendingForBusiness(businessId),
  ]);
  const now = new Date();
  return { today: items.map((r) => toBusinessResponse(r, now)), pendingCount };
}
