import type { PriceType } from '../enums';

/**
 * One row of the `services` table: something a business sells (e.g. "Women's haircut").
 * In code we call it an "offering" so it is not confused with the Services LAYER.
 */
export interface Offering {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  isBookable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
