/** SQL for `quote_requests`. */
import type { Page, PageQuery } from '../../models/dto/page.dto';
import type { BusinessQuoteTab, CustomerQuoteTab, NewQuoteRequest } from '../../models/dto/quote.dto';
import type { QuoteDecision, QuoteStatus } from '../../models/enums';
import type { QuoteRequest, QuoteRequestDetails } from '../../models/entities/quote-request.entity';
import { pool, type Queryable } from '../db';

interface QuoteRow {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string | null;
  subject: string;
  description: string;
  /** Read as text ("YYYY-MM-DD"), so no time zone can shift the day. */
  preferred_date_text: string | null;
  budget_cents: number | null;
  customer_phone: string | null;
  status: QuoteStatus;
  quoted_price_cents: number | null;
  business_message: string | null;
  responded_at: Date | null;
  customer_decision: QuoteDecision | null;
  customer_decided_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface DetailsRow extends QuoteRow {
  service_name: string | null;
  business_slug: string;
  business_name: string;
  business_logo_url: string | null;
  business_city: string | null;
  business_phone: string | null;
  business_contact_email: string | null;
  business_email: string;
  customer_name: string;
  customer_email: string;
  customer_account_phone: string | null;
}

function toQuote(row: QuoteRow): QuoteRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    serviceId: row.service_id,
    subject: row.subject,
    description: row.description,
    preferredDate: row.preferred_date_text,
    budgetCents: row.budget_cents,
    customerPhone: row.customer_phone,
    status: row.status,
    quotedPriceCents: row.quoted_price_cents,
    businessMessage: row.business_message,
    respondedAt: row.responded_at,
    customerDecision: row.customer_decision,
    customerDecidedAt: row.customer_decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDetails(row: DetailsRow): QuoteRequestDetails {
  return {
    ...toQuote(row),
    serviceName: row.service_name,
    businessSlug: row.business_slug,
    businessName: row.business_name,
    businessLogoUrl: row.business_logo_url,
    businessCity: row.business_city,
    businessPhone: row.business_phone,
    businessContactEmail: row.business_contact_email,
    businessEmail: row.business_email,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAccountPhone: row.customer_account_phone,
  };
}

const RETURNING = `RETURNING *, to_char(preferred_date, 'YYYY-MM-DD') AS preferred_date_text`;

/** Quote request + service + business + customer, everything the pages and emails need. */
const DETAILS = `
  SELECT q.*, to_char(q.preferred_date, 'YYYY-MM-DD') AS preferred_date_text,
         s.name AS service_name,
         p.slug AS business_slug, p.display_name AS business_name, p.logo_url AS business_logo_url,
         p.city AS business_city, p.contact_phone AS business_phone, p.contact_email AS business_contact_email,
         owner.email AS business_email,
         c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_account_phone
    FROM quote_requests q
    JOIN businesses b ON b.id = q.business_id
    JOIN business_profiles p ON p.business_id = b.id
    JOIN users owner ON owner.id = b.owner_user_id
    JOIN users c ON c.id = q.customer_id
    LEFT JOIN services s ON s.id = q.service_id`;

export async function insert(quote: NewQuoteRequest, db: Queryable = pool): Promise<QuoteRequest> {
  const result = await db.query<QuoteRow>(
    `INSERT INTO quote_requests
       (business_id, customer_id, service_id, subject, description, preferred_date, budget_cents, customer_phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ${RETURNING}`,
    [
      quote.businessId,
      quote.customerId,
      quote.serviceId,
      quote.subject,
      quote.description,
      quote.preferredDate,
      quote.budgetCents,
      quote.customerPhone,
    ],
  );
  return toQuote(result.rows[0]);
}

export async function findDetailsById(id: string, db: Queryable = pool): Promise<QuoteRequestDetails | null> {
  const result = await db.query<DetailsRow>(`${DETAILS} WHERE q.id = $1`, [id]);
  return result.rows[0] ? toDetails(result.rows[0]) : null;
}

const CUSTOMER_TABS: Record<CustomerQuoteTab, string> = {
  all: 'true',
  open: "q.status IN ('pending', 'processing')",
  answered: "q.status = 'completed'",
  declined: "q.status = 'rejected'",
};

const BUSINESS_TABS: Record<BusinessQuoteTab, string> = {
  new: "q.status = 'pending'",
  in_progress: "q.status = 'processing'",
  answered: "q.status = 'completed'",
  declined: "q.status = 'rejected'",
};

async function listWhere(
  ownerColumn: 'customer_id' | 'business_id',
  ownerId: string,
  where: string,
  page: PageQuery,
  db: Queryable,
): Promise<Page<QuoteRequestDetails>> {
  const [rows, count] = await Promise.all([
    db.query<DetailsRow>(
      `${DETAILS} WHERE q.${ownerColumn} = $1 AND (${where}) ORDER BY q.created_at DESC LIMIT $2 OFFSET $3`,
      [ownerId, page.pageSize, (page.page - 1) * page.pageSize],
    ),
    db.query<{ count: string }>(`SELECT count(*) FROM quote_requests q WHERE q.${ownerColumn} = $1 AND (${where})`, [ownerId]),
  ]);
  return { items: rows.rows.map(toDetails), total: Number(count.rows[0].count), page: page.page, pageSize: page.pageSize };
}

export function listForCustomer(customerId: string, tab: CustomerQuoteTab, page: PageQuery, db: Queryable = pool) {
  return listWhere('customer_id', customerId, CUSTOMER_TABS[tab], page, db);
}

export function listForBusiness(businessId: string, tab: BusinessQuoteTab, page: PageQuery, db: Queryable = pool) {
  return listWhere('business_id', businessId, BUSINESS_TABS[tab], page, db);
}

export async function countForCustomer(customerId: string, db: Queryable = pool): Promise<Record<Exclude<CustomerQuoteTab, 'all'>, number>> {
  const result = await db.query<{ open: string; answered: string; declined: string }>(
    `SELECT count(*) FILTER (WHERE ${CUSTOMER_TABS.open}) AS open,
            count(*) FILTER (WHERE ${CUSTOMER_TABS.answered}) AS answered,
            count(*) FILTER (WHERE ${CUSTOMER_TABS.declined}) AS declined
       FROM quote_requests q WHERE q.customer_id = $1`,
    [customerId],
  );
  const row = result.rows[0];
  return { open: Number(row.open), answered: Number(row.answered), declined: Number(row.declined) };
}

export async function countForBusiness(businessId: string, db: Queryable = pool): Promise<Record<BusinessQuoteTab, number>> {
  const result = await db.query<{ new: string; in_progress: string; answered: string; declined: string }>(
    `SELECT count(*) FILTER (WHERE ${BUSINESS_TABS.new}) AS new,
            count(*) FILTER (WHERE ${BUSINESS_TABS.in_progress}) AS in_progress,
            count(*) FILTER (WHERE ${BUSINESS_TABS.answered}) AS answered,
            count(*) FILTER (WHERE ${BUSINESS_TABS.declined}) AS declined
       FROM quote_requests q WHERE q.business_id = $1`,
    [businessId],
  );
  const row = result.rows[0];
  return { new: Number(row.new), in_progress: Number(row.in_progress), answered: Number(row.answered), declined: Number(row.declined) };
}

/**
 * Changes the status, but only if the current status is one of `from` (checked inside the UPDATE,
 * so two clicks at once cannot both succeed). Returns null if not allowed.
 * Answering ("completed") or declining ("rejected") also saves the message, price and time.
 */
export async function changeStatus(
  id: string,
  change: { to: QuoteStatus; from: QuoteStatus[]; message?: string | null; quotedPriceCents?: number | null },
  db: Queryable = pool,
): Promise<QuoteRequest | null> {
  const result = await db.query<QuoteRow>(
    `UPDATE quote_requests
        SET status = $2,
            business_message   = CASE WHEN $2 IN ('completed', 'rejected') THEN $4 ELSE business_message END,
            quoted_price_cents = CASE WHEN $2 = 'completed' THEN $5::integer ELSE quoted_price_cents END,
            responded_at       = CASE WHEN $2 IN ('completed', 'rejected') THEN now() ELSE responded_at END
      WHERE id = $1 AND status = ANY($3::text[])
      ${RETURNING}`,
    [id, change.to, change.from, change.message ?? null, change.quotedPriceCents ?? null],
  );
  return result.rows[0] ? toQuote(result.rows[0]) : null;
}

/** Saves the customer's answer to a quote. Only once, and only for answered ("completed") requests. */
export async function setCustomerDecision(id: string, decision: QuoteDecision, db: Queryable = pool): Promise<QuoteRequest | null> {
  const result = await db.query<QuoteRow>(
    `UPDATE quote_requests
        SET customer_decision = $2, customer_decided_at = now()
      WHERE id = $1 AND status = 'completed' AND customer_decision IS NULL
      ${RETURNING}`,
    [id, decision],
  );
  return result.rows[0] ? toQuote(result.rows[0]) : null;
}
