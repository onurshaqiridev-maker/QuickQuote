import type { PriceType } from '../enums';

/** Data needed to insert or update a service (offering). */
export interface OfferingInput {
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  isBookable: boolean;
  sortOrder: number;
}
