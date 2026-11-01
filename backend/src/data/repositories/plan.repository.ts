import type { PlanSeed } from '../../models/dto/seed.dto';
import { pool, type Queryable } from '../db';

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
