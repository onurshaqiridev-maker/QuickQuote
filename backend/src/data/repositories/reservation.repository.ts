/** SQL for `reservations`. */
import type { Page, PageQuery } from '../../models/dto/page.dto';
import type { BusinessReservationTab, CustomerReservationTab, NewReservation, TimeRange } from '../../models/dto/reservation.dto';
import type { ReservationStatus } from '../../models/enums';
import { DomainError } from '../../models/errors';
import type { Reservation, ReservationDetails } from '../../models/entities/reservation.entity';
import { pool, type Queryable } from '../db';
import { isPgError, PG_ERROR } from '../pg-errors';
import { containsPattern } from '../search-pattern';

interface ReservationRow {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  service_name: string;
  price_type: Reservation['priceType'];
  price_cents: number | null;
  starts_at: Date;
  ends_at: Date;
  status: ReservationStatus;
  customer_notes: string | null;
  customer_phone: string | null;
  business_message: string | null;
  cancelled_by: Reservation['cancelledBy'];
  confirmed_at: Date | null;
  rejected_at: Date | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface DetailsRow extends ReservationRow {
  business_slug: string;
  business_name: string;
  business_logo_url: string | null;
  business_city: string | null;
  business_address_line: string | null;
  business_phone: string | null;
  business_email: string;
  business_timezone: string;
  cancellation_notice_hours: number;
  customer_name: string;
  customer_email: string;
  customer_account_phone: string | null;
  customer_visits: string;
}

function toReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    priceType: row.price_type,
    priceCents: row.price_cents,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    customerNotes: row.customer_notes,
    customerPhone: row.customer_phone,
    businessMessage: row.business_message,
    cancelledBy: row.cancelled_by,
    confirmedAt: row.confirmed_at,
    rejectedAt: row.rejected_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDetails(row: DetailsRow): ReservationDetails {
  return {
    ...toReservation(row),
    businessSlug: row.business_slug,
    businessName: row.business_name,
    businessLogoUrl: row.business_logo_url,
    businessCity: row.business_city,
    businessAddressLine: row.business_address_line,
    businessPhone: row.business_phone,
    businessEmail: row.business_email,
    businessTimezone: row.business_timezone,
    cancellationNoticeHours: row.cancellation_notice_hours,
    durationMinutes: Math.round((row.ends_at.getTime() - row.starts_at.getTime()) / 60_000),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAccountPhone: row.customer_account_phone,
    customerVisits: Number(row.customer_visits),
  };
}

/** Reservation + business + customer, everything the pages and emails need. */
const DETAILS = `
  SELECT r.*,
         p.slug AS business_slug, p.display_name AS business_name, p.logo_url AS business_logo_url,
         p.city AS business_city, p.address_line AS business_address_line, p.contact_phone AS business_phone,
         owner.email AS business_email, b.timezone AS business_timezone, b.cancellation_notice_hours,
         c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_account_phone,
         (SELECT count(*) FROM reservations v
           WHERE v.business_id = r.business_id AND v.customer_id = r.customer_id AND v.status = 'completed') AS customer_visits
    FROM reservations r
    JOIN businesses b ON b.id = r.business_id
    JOIN business_profiles p ON p.business_id = b.id
    JOIN users owner ON owner.id = b.owner_user_id
    JOIN users c ON c.id = r.customer_id`;

/**
 * Saves a new reservation (status "pending").
 * If another pending/confirmed reservation overlaps, the database's exclusion constraint refuses it:
 * that becomes the friendly SLOT_UNAVAILABLE error.
 */
export async function insert(reservation: NewReservation, db: Queryable = pool): Promise<Reservation> {
  try {
    const result = await db.query<ReservationRow>(
      `INSERT INTO reservations
         (business_id, customer_id, service_id, service_name, price_type, price_cents, starts_at, ends_at, customer_notes, customer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        reservation.businessId,
        reservation.customerId,
        reservation.serviceId,
        reservation.serviceName,
        reservation.priceType,
        reservation.priceCents,
        reservation.startsAt,
        reservation.endsAt,
        reservation.customerNotes,
        reservation.customerPhone,
      ],
    );
    return toReservation(result.rows[0]);
  } catch (error) {
    if (isPgError(error, PG_ERROR.EXCLUSION_VIOLATION, 'reservations_no_overlap')) {
      throw new DomainError('SLOT_UNAVAILABLE', 'Sorry, this time was just booked by someone else. Please choose another time.');
    }
    throw error;
  }
}

/** Pending/confirmed reservations of a business that overlap [from, to). */
export async function listActiveBetween(businessId: string, from: Date, to: Date, db: Queryable = pool): Promise<TimeRange[]> {
  const result = await db.query<{ starts_at: Date; ends_at: Date }>(
    `SELECT starts_at, ends_at FROM reservations
      WHERE business_id = $1 AND status IN ('pending', 'confirmed') AND starts_at < $3 AND ends_at > $2`,
    [businessId, from, to],
  );
  return result.rows.map((row) => ({ start: row.starts_at, end: row.ends_at }));
}

export async function findDetailsById(id: string, db: Queryable = pool): Promise<ReservationDetails | null> {
  const result = await db.query<DetailsRow>(`${DETAILS} WHERE r.id = $1`, [id]);
  return result.rows[0] ? toDetails(result.rows[0]) : null;
}

const CUSTOMER_TABS: Record<CustomerReservationTab, { where: string; order: string }> = {
  upcoming: { where: "r.status IN ('pending', 'confirmed') AND r.ends_at > now()", order: 'r.starts_at ASC' },
  past: { where: "(r.status = 'completed' OR (r.status = 'confirmed' AND r.ends_at <= now()))", order: 'r.starts_at DESC' },
  cancelled: { where: "r.status IN ('cancelled', 'rejected')", order: 'r.starts_at DESC' },
};

export async function listForCustomer(
  customerId: string,
  tab: CustomerReservationTab,
  page: PageQuery,
  db: Queryable = pool,
): Promise<Page<ReservationDetails>> {
  const { where, order } = CUSTOMER_TABS[tab];
  const [rows, count] = await Promise.all([
    db.query<DetailsRow>(`${DETAILS} WHERE r.customer_id = $1 AND ${where} ORDER BY ${order} LIMIT $2 OFFSET $3`, [
      customerId,
      page.pageSize,
      (page.page - 1) * page.pageSize,
    ]),
    db.query<{ count: string }>(`SELECT count(*) FROM reservations r WHERE r.customer_id = $1 AND ${where}`, [customerId]),
  ]);
  return { items: rows.rows.map(toDetails), total: Number(count.rows[0].count), page: page.page, pageSize: page.pageSize };
}

export async function countForCustomer(customerId: string, db: Queryable = pool): Promise<Record<CustomerReservationTab, number>> {
  const result = await db.query<{ upcoming: string; past: string; cancelled: string }>(
    `SELECT count(*) FILTER (WHERE ${CUSTOMER_TABS.upcoming.where}) AS upcoming,
            count(*) FILTER (WHERE ${CUSTOMER_TABS.past.where}) AS past,
            count(*) FILTER (WHERE ${CUSTOMER_TABS.cancelled.where}) AS cancelled
       FROM reservations r WHERE r.customer_id = $1`,
    [customerId],
  );
  const row = result.rows[0];
  return { upcoming: Number(row.upcoming), past: Number(row.past), cancelled: Number(row.cancelled) };
}

const BUSINESS_TABS: Record<BusinessReservationTab, { where: string; order: string }> = {
  pending: { where: "r.status = 'pending' AND r.ends_at > now()", order: 'r.starts_at ASC' },
  upcoming: { where: "r.status IN ('pending', 'confirmed') AND r.ends_at > now()", order: 'r.starts_at ASC' },
  past: { where: "r.ends_at <= now() OR r.status IN ('completed', 'rejected', 'cancelled')", order: 'r.starts_at DESC' },
  all: { where: 'true', order: 'r.starts_at DESC' },
};

export async function listForBusiness(
  businessId: string,
  tab: BusinessReservationTab,
  page: PageQuery,
  db: Queryable = pool,
): Promise<Page<ReservationDetails>> {
  const { where, order } = BUSINESS_TABS[tab];
  const [rows, count] = await Promise.all([
    db.query<DetailsRow>(`${DETAILS} WHERE r.business_id = $1 AND (${where}) ORDER BY ${order} LIMIT $2 OFFSET $3`, [
      businessId,
      page.pageSize,
      (page.page - 1) * page.pageSize,
    ]),
    db.query<{ count: string }>(`SELECT count(*) FROM reservations r WHERE r.business_id = $1 AND (${where})`, [businessId]),
  ]);
  return { items: rows.rows.map(toDetails), total: Number(count.rows[0].count), page: page.page, pageSize: page.pageSize };
}

/** Pending/confirmed reservations of a business that start in [from, to) - e.g. "today". */
export async function listForBusinessBetween(businessId: string, from: Date, to: Date, db: Queryable = pool): Promise<ReservationDetails[]> {
  const result = await db.query<DetailsRow>(
    `${DETAILS} WHERE r.business_id = $1 AND r.status IN ('pending', 'confirmed') AND r.starts_at >= $2 AND r.starts_at < $3
      ORDER BY r.starts_at`,
    [businessId, from, to],
  );
  return result.rows.map(toDetails);
}

export async function countPendingForBusiness(businessId: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    "SELECT count(*) FROM reservations WHERE business_id = $1 AND status = 'pending' AND ends_at > now()",
    [businessId],
  );
  return Number(result.rows[0].count);
}

/**
 * Changes the status, but only if the current status is one of `from` (checked inside the UPDATE,
 * so two clicks at once cannot both succeed). Sets the matching *_at time. Returns null if not allowed.
 */
export async function changeStatus(
  id: string,
  change: { to: ReservationStatus; from: ReservationStatus[]; message?: string | null; cancelledBy?: 'customer' | 'business' | 'system' },
  db: Queryable = pool,
): Promise<Reservation | null> {
  const result = await db.query<ReservationRow>(
    `UPDATE reservations
        SET status = $2,
            business_message = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE business_message END,
            cancelled_by = CASE WHEN $2 = 'cancelled' THEN $5 ELSE cancelled_by END,
            confirmed_at = CASE WHEN $2 = 'confirmed' THEN now() ELSE confirmed_at END,
            rejected_at  = CASE WHEN $2 = 'rejected'  THEN now() ELSE rejected_at END,
            cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END,
            completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
      WHERE id = $1 AND status = ANY($3::text[])
      RETURNING *`,
    [id, change.to, change.from, change.message ?? null, change.cancelledBy ?? null],
  );
  return result.rows[0] ? toReservation(result.rows[0]) : null;
}

/** Maintenance: confirmed reservations that ended more than `hours` ago become "completed". Returns how many. */
export async function completeFinished(hours: number, db: Queryable = pool): Promise<number> {
  const result = await db.query(
    `UPDATE reservations SET status = 'completed', completed_at = now()
      WHERE status = 'confirmed' AND ends_at < now() - make_interval(hours => $1)`,
    [hours],
  );
  return result.rowCount ?? 0;
}

/** Maintenance: pending reservations whose start time has passed (nobody answered). Returns their ids. */
export async function findUnansweredPast(db: Queryable = pool): Promise<string[]> {
  const result = await db.query<{ id: string }>("SELECT id FROM reservations WHERE status = 'pending' AND starts_at <= now()");
  return result.rows.map((row) => row.id);
}

/**
 * Admin: all reservations, newest appointment first.
 * `search` matches the business, the customer's name or email, or the service.
 * `from` / `to` ("YYYY-MM-DD", both included) filter on the appointment day.
 */
export async function listForAdmin(
  filter: { status?: ReservationStatus; search?: string; from?: string; to?: string } & PageQuery,
  db: Queryable = pool,
): Promise<Page<ReservationDetails>> {
  const where = `
    WHERE ($1::text IS NULL OR r.status = $1)
      AND ($2::text IS NULL OR p.display_name ILIKE $2 OR c.full_name ILIKE $2 OR c.email ILIKE $2 OR r.service_name ILIKE $2)
      AND ($3::date IS NULL OR r.starts_at >= $3::date)
      AND ($4::date IS NULL OR r.starts_at < $4::date + 1)`;
  const params = [filter.status ?? null, filter.search ? containsPattern(filter.search) : null, filter.from ?? null, filter.to ?? null];
  const [rows, count] = await Promise.all([
    db.query<DetailsRow>(`${DETAILS} ${where} ORDER BY r.starts_at DESC, r.id LIMIT $5 OFFSET $6`, [
      ...params,
      filter.pageSize,
      (filter.page - 1) * filter.pageSize,
    ]),
    db.query<{ count: string }>(
      `SELECT count(*) FROM reservations r
         JOIN business_profiles p ON p.business_id = r.business_id
         JOIN users c ON c.id = r.customer_id ${where}`,
      params,
    ),
  ]);
  return { items: rows.rows.map(toDetails), total: Number(count.rows[0].count), page: filter.page, pageSize: filter.pageSize };
}
