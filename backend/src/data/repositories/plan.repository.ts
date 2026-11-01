import type { PlanSeed } from '../../models/dto/seed.dto';
import type { SubscriptionPlan } from '../../models/entities/subscription-plan.entity';
import { pool, type Queryable } from '../db';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: 'month';
  max_services: number | null;
  max_photos: number;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function toPlan(row: PlanRow): SubscriptionPlan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    billingInterval: row.billing_interval,
    maxServices: row.max_services,
    maxPhotos: row.max_photos,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Plans offered to new businesses, cheapest first. */
export async function listActive(db: Queryable = pool): Promise<SubscriptionPlan[]> {
  const result = await db.query<PlanRow>(
    'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order, price_cents',
  );
  return result.rows.map(toPlan);
}

/**
 * Inserts a plan unless one with the same code exists (so the admin's later
 * price changes are never overwritten by the seed). Returns true if it was created.
 */
export async function insertIfMissing(plan: PlanSeed, db: Queryable = pool): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO subscription_plans
       (code, name, description, price_cents, max_services, max_photos, is_featured, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (code) DO NOTHING`,
    [
      plan.code,
      plan.name,
      plan.description,
      plan.priceCents,
      plan.maxServices,
      plan.maxPhotos,
      plan.isFeatured,
      plan.sortOrder,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

/** The cheapest active plan (its limits apply while a business has no subscription yet). */
export async function findCheapestActive(db: Queryable = pool): Promise<SubscriptionPlan | null> {
  const result = await db.query<PlanRow>(
    'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_cents, sort_order LIMIT 1',
  );
  return result.rows[0] ? toPlan(result.rows[0]) : null;
}
