/** A subscription plan as shown on the pricing page. */
export interface PlanResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingInterval: 'month';
  /** null = unlimited */
  maxServices: number | null;
  maxPhotos: number;
  isFeatured: boolean;
}
