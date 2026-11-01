/** One row of the `subscription_plans` table. */
export interface SubscriptionPlan {
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
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
