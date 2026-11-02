/**
 * Quote requests: a customer describes what they need, the business answers with a message and maybe a price,
 * and the customer accepts or declines the quote.
 * Status flow (docs/USER_FLOWS.md 7.3):
 *   pending -> processing | completed | rejected
 *   processing -> completed | rejected
 * After "completed", the customer's decision (accepted / declined) is stored next to the status.
 */
import { DateTime } from 'luxon';
import { env } from '../config/env';
import { withTransaction, type Transaction } from '../data/db';
import * as offeringRepository from '../data/repositories/offering.repository';
import * as publicBusinessRepository from '../data/repositories/public-business.repository';
import * as quoteRepository from '../data/repositories/quote.repository';
import type { QuoteEmailData } from '../models/dto/email.dto';
import type { Page } from '../models/dto/page.dto';
import type { AuthenticatedUser } from '../models/dto/user.dto';
import type { QuoteRequestDetails } from '../models/entities/quote-request.entity';
import type { QuoteDecision, QuoteStatus } from '../models/enums';
import { DomainError, NotFoundError, ValidationError } from '../models/errors';
import type {
  BusinessQuotesQuery,
  CreateQuoteRequestInput,
  CustomerQuotesQuery,
  RespondToQuoteInput,
} from '../models/requests/quote.requests';
import type {
  BusinessQuoteCounts,
  BusinessQuoteResponse,
  CustomerQuoteResponse,
  CustomerQuoteSummary,
} from '../models/responses/quote.response';
import { logActivity } from './activity.service';
import { enqueueEmail } from './email/email-queue.service';
import { formatEuros, formatLongDate } from './formatting';

const link = (path: string) => new URL(path, env.FRONTEND_URL).toString();

/** How far ahead a preferred date may be. */
const MAX_PREFERRED_DATE_YEARS = 2;

// ---------------------------------------------------------------------------
// Turning rows into responses
// ---------------------------------------------------------------------------

function baseResponse(q: QuoteRequestDetails) {
  return {
    id: q.id,
    status: q.status,
    subject: q.subject,
    description: q.description,
    preferredDate: q.preferredDate,
    budgetCents: q.budgetCents,
    service: q.serviceId && q.serviceName ? { id: q.serviceId, name: q.serviceName } : null,
    quotedPriceCents: q.quotedPriceCents,
    businessMessage: q.businessMessage,
    respondedAt: q.respondedAt?.toISOString() ?? null,
    customerDecision: q.customerDecision,
    customerDecidedAt: q.customerDecidedAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
  };
}

export function toCustomerQuoteResponse(q: QuoteRequestDetails): CustomerQuoteResponse {
  return {
    ...baseResponse(q),
    business: {
      slug: q.businessSlug,
      displayName: q.businessName,
      logoUrl: q.businessLogoUrl,
      city: q.businessCity,
      phone: q.businessPhone,
      email: q.businessContactEmail,
    },
    canDecide: q.status === 'completed' && q.customerDecision === null,
  };
}

export function toBusinessQuoteResponse(q: QuoteRequestDetails): BusinessQuoteResponse {
  return {
    ...baseResponse(q),
    customer: { name: q.customerName, email: q.customerEmail, phone: q.customerPhone ?? q.customerAccountPhone },
  };
}

function emailData(q: QuoteRequestDetails): QuoteEmailData {
  return { businessName: q.businessName, subject: q.subject, serviceName: q.serviceName };
}

/** "€4,600.00", or a note when the business left the price open. */
function quotedPriceText(q: QuoteRequestDetails): string | null {
  return q.quotedPriceCents === null ? null : formatEuros(q.quotedPriceCents);
}

async function loadDetails(id: string, tx?: Transaction): Promise<QuoteRequestDetails> {
  const details = await quoteRepository.findDetailsById(id, tx);
  if (!details) throw new NotFoundError('Quote request not found.');
  return details;
}

/** Loads a request of THIS business (another business's request looks like "not found"). */
async function loadForBusiness(businessId: string, id: string): Promise<QuoteRequestDetails> {
  const details = await loadDetails(id);
  if (details.businessId !== businessId) throw new NotFoundError('Quote request not found.');
  return details;
}

/** Loads a request of THIS customer. */
async function loadForCustomer(customerId: string, id: string): Promise<QuoteRequestDetails> {
  const details = await loadDetails(id);
  if (details.customerId !== customerId) throw new NotFoundError('Quote request not found.');
  return details;
}

// ---------------------------------------------------------------------------
// Customer sends a request
// ---------------------------------------------------------------------------

/** The preferred date must be today or later (in the business's time zone) and not years away. */
function checkPreferredDate(date: string | undefined, timezone: string): void {
  if (!date) return;
  const day = DateTime.fromISO(date, { zone: timezone });
  const today = DateTime.now().setZone(timezone).startOf('day');
  if (!day.isValid) throw new ValidationError([{ field: 'preferredDate', message: 'This date does not exist.' }]);
  if (day < today) throw new ValidationError([{ field: 'preferredDate', message: 'The preferred date cannot be in the past.' }]);
  if (day > today.plus({ years: MAX_PREFERRED_DATE_YEARS })) {
    throw new ValidationError([{ field: 'preferredDate', message: `Please choose a date within the next ${MAX_PREFERRED_DATE_YEARS} years.` }]);
  }
}

export async function createQuoteRequest(customer: AuthenticatedUser, input: CreateQuoteRequestInput): Promise<CustomerQuoteResponse> {
  const business = await publicBusinessRepository.findVisibleById(input.businessId, env.SUBSCRIPTIONS_REQUIRED);
  if (!business) throw new NotFoundError('This business is not accepting requests right now.');

  if (input.serviceId) {
    const service = await offeringRepository.findForBusiness(business.id, input.serviceId);
    if (!service || !service.isActive) throw new ValidationError([{ field: 'serviceId', message: 'This service is not offered any more.' }]);
  }
  checkPreferredDate(input.preferredDate, business.timezone);

  const quoteId = await withTransaction(async (tx) => {
    const quote = await quoteRepository.insert(
      {
        businessId: business.id,
        customerId: customer.id,
        serviceId: input.serviceId ?? null,
        subject: input.subject,
        description: input.description,
        preferredDate: input.preferredDate ?? null,
        budgetCents: input.budgetCents ?? null,
        customerPhone: input.phone ?? null,
      },
      tx,
    );
    const details = await loadDetails(quote.id, tx);

    await enqueueEmail(
      {
        to: details.businessEmail,
        template: 'quote_new_business',
        payload: {
          ...emailData(details),
          customerName: details.customerName,
          customerEmail: details.customerEmail,
          customerPhone: details.customerPhone ?? details.customerAccountPhone,
          description: details.description,
          preferredDate: details.preferredDate ? formatLongDate(details.preferredDate) : null,
          budget: details.budgetCents === null ? null : formatEuros(details.budgetCents),
          dashboardUrl: link('/dashboard/quotes'),
        },
      },
      tx,
    );
    await enqueueEmail(
      {
        to: details.customerEmail,
        template: 'quote_received_customer',
        payload: { ...emailData(details), customerName: details.customerName, accountUrl: link('/account/quotes') },
      },
      tx,
    );
    await logActivity({ actorUserId: customer.id, action: 'quote.created', entityType: 'quote_request', entityId: quote.id }, tx);
    return quote.id;
  });

  return toCustomerQuoteResponse(await loadDetails(quoteId));
}

// ---------------------------------------------------------------------------
// Business answers
// ---------------------------------------------------------------------------

/** Changes the status (only from the allowed statuses), emails the customer and logs it, all in one transaction. */
async function changeStatus(
  details: QuoteRequestDetails,
  change: { to: Exclude<QuoteStatus, 'pending'>; from: QuoteStatus[]; message?: string | null; quotedPriceCents?: number | null },
  actorUserId: string,
): Promise<BusinessQuoteResponse> {
  await withTransaction(async (tx) => {
    const updated = await quoteRepository.changeStatus(details.id, change, tx);
    if (!updated) {
      throw new DomainError('INVALID_STATUS_TRANSITION', `This request is "${details.status}" and cannot be changed that way.`);
    }
    const fresh = await loadDetails(details.id, tx);
    await enqueueEmail(
      {
        to: fresh.customerEmail,
        template: 'quote_status_customer',
        payload: {
          ...emailData(fresh),
          customerName: fresh.customerName,
          status: change.to,
          price: change.to === 'completed' ? quotedPriceText(fresh) : null,
          message: fresh.status === 'processing' ? null : fresh.businessMessage,
          accountUrl: link('/account/quotes'),
        },
      },
      tx,
    );
    await logActivity({ actorUserId, action: `quote.${change.to}`, entityType: 'quote_request', entityId: details.id }, tx);
  });
  return toBusinessQuoteResponse(await loadDetails(details.id));
}

/** "We are working on it": pending -> processing. */
export async function startQuote(businessId: string, id: string, actorUserId: string): Promise<BusinessQuoteResponse> {
  const details = await loadForBusiness(businessId, id);
  return changeStatus(details, { to: 'processing', from: ['pending'] }, actorUserId);
}

/** Sends the quote: a message and (optionally) a price. */
export async function respondToQuote(businessId: string, id: string, actorUserId: string, input: RespondToQuoteInput): Promise<BusinessQuoteResponse> {
  const details = await loadForBusiness(businessId, id);
  return changeStatus(
    details,
    { to: 'completed', from: ['pending', 'processing'], message: input.message, quotedPriceCents: input.quotedPriceCents ?? null },
    actorUserId,
  );
}

/** The business cannot take the job. */
export async function rejectQuote(businessId: string, id: string, actorUserId: string, message: string | null): Promise<BusinessQuoteResponse> {
  const details = await loadForBusiness(businessId, id);
  return changeStatus(details, { to: 'rejected', from: ['pending', 'processing'], message }, actorUserId);
}

// ---------------------------------------------------------------------------
// Customer accepts or declines the quote
// ---------------------------------------------------------------------------

export async function decideQuote(customerId: string, id: string, decision: QuoteDecision): Promise<CustomerQuoteResponse> {
  const details = await loadForCustomer(customerId, id);
  await withTransaction(async (tx) => {
    const updated = await quoteRepository.setCustomerDecision(id, decision, tx);
    if (!updated) {
      const reason = details.customerDecision
        ? `You already ${details.customerDecision} this quote.`
        : 'You can only accept or decline a quote after the business has answered.';
      throw new DomainError('INVALID_STATUS_TRANSITION', reason);
    }
    await enqueueEmail(
      {
        to: details.businessEmail,
        template: 'quote_decision_business',
        payload: {
          ...emailData(details),
          customerName: details.customerName,
          customerEmail: details.customerEmail,
          customerPhone: details.customerPhone ?? details.customerAccountPhone,
          decision,
          price: quotedPriceText(details),
          dashboardUrl: link('/dashboard/quotes?tab=answered'),
        },
      },
      tx,
    );
    await logActivity({ actorUserId: customerId, action: `quote.${decision}`, entityType: 'quote_request', entityId: id }, tx);
  });
  return toCustomerQuoteResponse(await loadDetails(id));
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listCustomerQuotes(customerId: string, query: CustomerQuotesQuery): Promise<Page<CustomerQuoteResponse>> {
  const page = await quoteRepository.listForCustomer(customerId, query.tab, query);
  return { ...page, items: page.items.map(toCustomerQuoteResponse) };
}

export async function getCustomerQuote(customerId: string, id: string): Promise<CustomerQuoteResponse> {
  return toCustomerQuoteResponse(await loadForCustomer(customerId, id));
}

/** For the customer overview: the 3 latest requests and the counts per tab. */
export async function getCustomerQuoteSummary(customerId: string): Promise<CustomerQuoteSummary> {
  const [recent, counts] = await Promise.all([
    quoteRepository.listForCustomer(customerId, 'all', { page: 1, pageSize: 3 }),
    quoteRepository.countForCustomer(customerId),
  ]);
  return { recent: recent.items.map(toCustomerQuoteResponse), counts };
}

export async function listBusinessQuotes(businessId: string, query: BusinessQuotesQuery): Promise<Page<BusinessQuoteResponse>> {
  const page = await quoteRepository.listForBusiness(businessId, query.tab, query);
  return { ...page, items: page.items.map(toBusinessQuoteResponse) };
}

export async function getBusinessQuote(businessId: string, id: string): Promise<BusinessQuoteResponse> {
  return toBusinessQuoteResponse(await loadForBusiness(businessId, id));
}

/** Counts per tab: for the tabs and the business overview ("2 new quote requests"). */
export function getBusinessQuoteCounts(businessId: string): Promise<BusinessQuoteCounts> {
  return quoteRepository.countForBusiness(businessId);
}
