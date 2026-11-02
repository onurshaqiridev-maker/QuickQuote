/**
 * All fixed lists of values used in Quick Quote.
 * They match the CHECK constraints in the database migrations exactly.
 */

export const USER_ROLES = ['customer', 'business_owner', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended', 'deactivated'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const AUTH_TOKEN_PURPOSES = ['email_verification', 'password_reset'] as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

export const BUSINESS_STATUSES = ['pending_review', 'approved', 'suspended', 'deactivated'] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const PRICE_TYPES = ['fixed', 'starting_from', 'on_request'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const QUOTE_STATUSES = ['pending', 'processing', 'completed', 'rejected'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** What the customer did with a quote the business sent. */
export const QUOTE_DECISIONS = ['accepted', 'declined'] as const;
export type QuoteDecision = (typeof QUOTE_DECISIONS)[number];

export const SUBSCRIPTION_STATUSES = ['pending_payment', 'active', 'past_due', 'cancelled', 'expired'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = ['mock', 'manual', 'stripe'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** Email queue job statuses: waiting/being retried, delivered to Resend, or given up. */
export const EMAIL_JOB_STATUSES = ['pending', 'sent', 'failed'] as const;
export type EmailJobStatus = (typeof EMAIL_JOB_STATUSES)[number];

/**
 * Icon names a category can use. The website draws each one (frontend/src/components/ui/CategoryIcon.tsx),
 * so both lists must stay the same.
 */
export const CATEGORY_ICONS = [
  'scissors', 'stethoscope', 'wrench', 'sparkles', 'hammer', 'car', 'party-popper', 'camera',
  'book-open', 'laptop', 'dumbbell', 'scale', 'utensils', 'paw-print', 'music', 'shirt', 'house', 'leaf', 'heart', 'store',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
