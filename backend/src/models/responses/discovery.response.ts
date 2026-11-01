import type { PriceType } from '../enums';
import type { PhotoResponse, WorkingHoursRangeResponse } from './business.response';

export interface PublicCategory {
  slug: string;
  name: string;
  icon: string | null;
}

/** One card on the Explore page. */
export interface BusinessCardResponse {
  id: string;
  slug: string;
  displayName: string;
  /** The first ~160 characters of the description. */
  shortDescription: string | null;
  logoUrl: string | null;
  city: string | null;
  isFeatured: boolean;
  /** Lowest price among active services with a price, or null. */
  startingPriceCents: number | null;
  categories: PublicCategory[];
}

export interface PublicServiceResponse {
  id: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  isBookable: boolean;
}

/** The public profile page of a business. */
export interface PublicBusinessResponse {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  isFeatured: boolean;
  timezone: string;
  contact: { email: string | null; phone: string | null; websiteUrl: string | null };
  address: { line: string | null; city: string | null; postalCode: string | null; country: string | null };
  categories: PublicCategory[];
  photos: PhotoResponse[];
  services: PublicServiceResponse[];
  workingHours: WorkingHoursRangeResponse[];
}

export interface CityResponse {
  name: string;
  businessCount: number;
}
