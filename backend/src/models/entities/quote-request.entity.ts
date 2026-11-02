import type { QuoteDecision, QuoteStatus } from '../enums';

/** One row of the `quote_requests` table. */
export interface QuoteRequest {
  id: string;
  businessId: string;
  customerId: string;
  /** null = a general request, not about one specific service */
  serviceId: string | null;
  subject: string;
  description: string;
  /** "YYYY-MM-DD" */
  preferredDate: string | null;
  budgetCents: number | null;
  customerPhone: string | null;
  status: QuoteStatus;
  quotedPriceCents: number | null;
  businessMessage: string | null;
  respondedAt: Date | null;
  customerDecision: QuoteDecision | null;
  customerDecidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A quote request together with what the customer and business pages and emails need. */
export interface QuoteRequestDetails extends QuoteRequest {
  serviceName: string | null;
  businessSlug: string;
  businessName: string;
  businessLogoUrl: string | null;
  businessCity: string | null;
  businessPhone: string | null;
  /** The public contact email of the profile (may be empty). */
  businessContactEmail: string | null;
  /** The owner's login email: where the business's notifications go. */
  businessEmail: string;
  customerName: string;
  customerEmail: string;
  customerAccountPhone: string | null;
}
