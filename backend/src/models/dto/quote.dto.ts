export interface NewQuoteRequest {
  businessId: string;
  customerId: string;
  serviceId: string | null;
  subject: string;
  description: string;
  preferredDate: string | null;
  budgetCents: number | null;
  customerPhone: string | null;
}

/** Customer's list: still waiting, answered with a quote, or declined by the business. */
export type CustomerQuoteTab = 'all' | 'open' | 'answered' | 'declined';
/** Business's list, one tab per status: pending, processing, completed, rejected. */
export type BusinessQuoteTab = 'new' | 'in_progress' | 'answered' | 'declined';
