import type { SubscriptionWithPlan } from '../../models/entities/subscription.entity';
import { pool, type Queryable } from '../db';

interface SubscriptionRow {
  id: string;
  business_id: string;
  status: SubscriptionWithPlan['status'];
  current_period_end: Date | null;
  plan_id: string;
  plan_name: string;
  max_services: number | null;
  max_photos: number;
  is_featured: boolean;
}

/** The business's "current" subscription (pending_payment, active or past_due), with its plan. */
export async function findCurrent(businessId: string, db: Queryable = pool): Promise<SubscriptionWithPlan | null> {
  const result = await db.query<SubscriptionRow>(
    `SELECT s.id, s.business_id, s.status, s.current_period_end,
            p.id AS plan_id, p.name AS plan_name, p.max_services, p.max_photos, p.is_featured
       FROM subscriptions s
       JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.business_id = $1 AND s.status IN ('pending_payment', 'active', 'past_due')`,
    [businessId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    planId: row.plan_id,
    planName: row.plan_name,
    maxServices: row.max_services,
    maxPhotos: row.max_photos,
    isFeatured: row.is_featured,
  };
}
