/** SQL for the `services` table (called "offerings" in code). */
import type { OfferingInput } from '../../models/dto/offering.dto';
import type { Offering } from '../../models/entities/offering.entity';
import { pool, type Queryable } from '../db';

interface OfferingRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_type: Offering['priceType'];
  price_cents: number | null;
  duration_minutes: number | null;
  is_bookable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function toOffering(row: OfferingRow): Offering {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    priceType: row.price_type,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes,
    isBookable: row.is_bookable,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All services of a business: active ones first, then archived. */
export async function listByBusiness(businessId: string, db: Queryable = pool): Promise<Offering[]> {
  const result = await db.query<OfferingRow>(
    'SELECT * FROM services WHERE business_id = $1 ORDER BY is_active DESC, sort_order, created_at',
    [businessId],
  );
  return result.rows.map(toOffering);
}

export async function findForBusiness(businessId: string, id: string, db: Queryable = pool): Promise<Offering | null> {
  const result = await db.query<OfferingRow>('SELECT * FROM services WHERE id = $1 AND business_id = $2', [id, businessId]);
  return result.rows[0] ? toOffering(result.rows[0]) : null;
}

export async function countActive(businessId: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    'SELECT count(*) FROM services WHERE business_id = $1 AND is_active',
    [businessId],
  );
  return Number(result.rows[0].count);
}

export async function nextSortOrder(businessId: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ next: number }>(
    'SELECT coalesce(max(sort_order) + 1, 0) AS next FROM services WHERE business_id = $1',
    [businessId],
  );
  return result.rows[0].next;
}

export async function insert(businessId: string, input: OfferingInput, db: Queryable = pool): Promise<Offering> {
  const result = await db.query<OfferingRow>(
    `INSERT INTO services (business_id, name, description, price_type, price_cents, duration_minutes, is_bookable, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [businessId, input.name, input.description, input.priceType, input.priceCents, input.durationMinutes, input.isBookable, input.sortOrder],
  );
  return toOffering(result.rows[0]);
}

export async function update(
  businessId: string,
  id: string,
  input: OfferingInput & { isActive: boolean },
  db: Queryable = pool,
): Promise<Offering | null> {
  const result = await db.query<OfferingRow>(
    `UPDATE services
        SET name = $3, description = $4, price_type = $5, price_cents = $6, duration_minutes = $7,
            is_bookable = $8, sort_order = $9, is_active = $10
      WHERE id = $1 AND business_id = $2
      RETURNING *`,
    [id, businessId, input.name, input.description, input.priceType, input.priceCents, input.durationMinutes, input.isBookable, input.sortOrder, input.isActive],
  );
  return result.rows[0] ? toOffering(result.rows[0]) : null;
}

/** Archive = hide it, but keep it for old reservations. */
export async function archive(businessId: string, id: string, db: Queryable = pool): Promise<Offering | null> {
  const result = await db.query<OfferingRow>(
    'UPDATE services SET is_active = false WHERE id = $1 AND business_id = $2 RETURNING *',
    [id, businessId],
  );
  return result.rows[0] ? toOffering(result.rows[0]) : null;
}
