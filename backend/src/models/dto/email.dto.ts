/**
 * Email shapes.
 *
 * `EmailPayloads` lists every email template and the data it needs.
 * TypeScript then checks that every `enqueueEmail(...)` call passes the right data.
 * New emails (for example subscriptions) are added here in later phases.
 */
export interface EmailPayloads {
  customer_welcome: { fullName: string; verifyUrl: string };
  business_welcome: { fullName: string; businessName: string; verifyUrl: string; dashboardUrl: string };
  admin_new_business: { businessName: string; ownerName: string; ownerEmail: string; city: string };
  verify_email: { fullName: string; verifyUrl: string };
  password_reset: { fullName: string; resetUrl: string };
  contact_message_admin: { name: string; email: string; subject: string; message: string };
  business_approved: { fullName: string; businessName: string; isPublished: boolean; profileUrl: string; dashboardUrl: string };
  business_suspended: { fullName: string; businessName: string; status: 'suspended' | 'deactivated'; reason: string; contactUrl: string };
  reservation_new_business: ReservationEmailData & { customerName: string; customerEmail: string; customerPhone: string | null; customerNotes: string | null; dashboardUrl: string };
  reservation_received_customer: ReservationEmailData & { customerName: string; accountUrl: string };
  reservation_confirmed_customer: ReservationEmailData & { customerName: string; address: string | null; accountUrl: string };
  reservation_rejected_customer: ReservationEmailData & { customerName: string; message: string | null; profileUrl: string };
  reservation_cancelled_customer: ReservationEmailData & { customerName: string; message: string | null; cancelledBy: 'business' | 'system'; profileUrl: string };
  reservation_cancelled_business: ReservationEmailData & { customerName: string; message: string | null; dashboardUrl: string };
  quote_new_business: QuoteEmailData & {
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    description: string;
    preferredDate: string | null;
    budget: string | null;
    dashboardUrl: string;
  };
  quote_received_customer: QuoteEmailData & { customerName: string; accountUrl: string };
  quote_status_customer: QuoteEmailData & {
    customerName: string;
    status: 'processing' | 'completed' | 'rejected';
    price: string | null;
    message: string | null;
    accountUrl: string;
  };
  quote_decision_business: QuoteEmailData & {
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    decision: 'accepted' | 'declined';
    price: string | null;
    dashboardUrl: string;
  };
}

/** Details every quote email shows. */
export interface QuoteEmailData {
  businessName: string;
  subject: string;
  /** null = a general request */
  serviceName: string | null;
}

/** Details every reservation email shows. Dates are already formatted in the business's time zone. */
export interface ReservationEmailData {
  businessName: string;
  serviceName: string;
  /** e.g. "Tuesday, 10 November 2026 at 09:30" */
  when: string;
  price: string;
}

export type EmailTemplateName = keyof EmailPayloads;

/** What a service passes to the queue: "send THIS template with THIS data to THIS person". */
export interface EnqueueEmailInput<T extends EmailTemplateName = EmailTemplateName> {
  to: string;
  template: T;
  payload: EmailPayloads[T];
  /** Optional: a job with the same key is only ever queued once. */
  dedupeKey?: string;
  /** Optional: do not send before this moment. */
  runAt?: Date;
}

/** Data needed to insert one row into `email_jobs`. */
export interface NewEmailJob {
  toEmail: string;
  template: string;
  payload: Record<string, unknown>;
  maxAttempts: number;
  dedupeKey: string | null;
  runAt: Date | null;
}

/** A template turned into real email content. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** A complete email, ready for a sender (console or Resend). */
export interface OutgoingEmail extends RenderedEmail {
  to: string;
  /** Stays the same across retries, so the provider can ignore accidental duplicates. */
  idempotencyKey: string;
}

/** What a sender returns after the provider accepted the email. */
export interface SendResult {
  providerMessageId: string | null;
}

/** Summary of one worker run (used for logs and tests). */
export interface EmailBatchResult {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
}
