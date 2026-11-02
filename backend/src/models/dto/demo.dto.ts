import type { PriceType } from '../enums';

/** One demo business for `npm run seed:demo` (development only). */
export interface DemoBusinessSpec {
  ownerName: string;
  ownerEmail: string;
  name: string;
  description: string;
  city: string;
  addressLine: string;
  postalCode: string;
  country: string;
  phone: string;
  website: string | null;
  categorySlugs: string[];
  /** false = left waiting for admin review (to try the approval page) */
  approved: boolean;
  services: { name: string; description?: string; priceType: PriceType; priceCents: number | null; durationMinutes: number | null; isBookable: boolean }[];
  /** e.g. [{ days: [1,2,3,4,5], startTime: '09:00', endTime: '18:00' }] */
  hours: { days: number[]; startTime: string; endTime: string }[];
  logo: Buffer;
  photos: { image: Buffer; caption: string }[];
}

export interface DemoCustomerSpec {
  fullName: string;
  email: string;
}

/** One demo quote request, optionally already answered by the business (and decided by the customer). */
export interface DemoQuoteSpec {
  customerEmail: string;
  /** The business is found by its owner's email. */
  businessOwnerEmail: string;
  /** null = a general request */
  serviceName: string | null;
  subject: string;
  description: string;
  /** Days from today, or null for no preferred date */
  preferredInDays: number | null;
  budgetCents: number | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  /** The business's answer (for completed / rejected) */
  answer?: { message: string; quotedPriceCents?: number };
  decision?: 'accepted' | 'declined';
}

export interface DemoSeedSummary {
  businessesCreated: number;
  customersCreated: number;
  quotesCreated: number;
  skipped: number;
}
