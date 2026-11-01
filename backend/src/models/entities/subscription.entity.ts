import type { SubscriptionStatus } from '../enums';

/** One row of the `subscriptions` table, joined with its plan's name and limits. */
export interface SubscriptionWithPlan {
  id: string;
  businessId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  planId: string;
  planName: string;
  maxServices: number | null;
  maxPhotos: number;
  isFeatured: boolean;
}
