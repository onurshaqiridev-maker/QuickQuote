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

export interface DemoSeedSummary {
  businessesCreated: number;
  customersCreated: number;
  skipped: number;
}
