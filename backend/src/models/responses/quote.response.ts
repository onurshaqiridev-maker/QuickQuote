import type { QuoteDecision, QuoteStatus } from '../enums';

/** The part every quote response shares. */
interface QuoteResponseBase {
  id: string;
  status: QuoteStatus;
  subject: string;
  description: string;
  /** "YYYY-MM-DD" */
  preferredDate: string | null;
  budgetCents: number | null;
  /** null = a general request */
  service: { id: string; name: string } | null;
  /** The business's answer (when answered or declined) */
  quotedPriceCents: number | null;
  businessMessage: string | null;
  respondedAt: string | null;
  /** What the customer did with the quote */
  customerDecision: QuoteDecision | null;
  customerDecidedAt: string | null;
  createdAt: string;
}

/** A quote request as the customer sees it. */
export interface CustomerQuoteResponse extends QuoteResponseBase {
  business: { slug: string; displayName: string; logoUrl: string | null; city: string | null; phone: string | null; email: string | null };
  /** true while the quote is answered and the customer has not accepted or declined yet */
  canDecide: boolean;
}

/** A quote request as the business sees it, with customer information. */
export interface BusinessQuoteResponse extends QuoteResponseBase {
  customer: { name: string; email: string; phone: string | null };
}

/** Counts for the tabs of the business's quote page. */
export interface BusinessQuoteCounts {
  new: number;
  in_progress: number;
  answered: number;
  declined: number;
}

/** The quote part of the customer overview. */
export interface CustomerQuoteSummary {
  recent: CustomerQuoteResponse[];
  counts: { open: number; answered: number; declined: number };
}
