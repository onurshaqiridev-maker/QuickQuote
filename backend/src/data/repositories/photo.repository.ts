import type { BusinessPhoto } from '../../models/entities/business-photo.entity';
import { pool, type Queryable } from '../db';

interface PhotoRow {
  id: string;
  business_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: Date;
}

function toPhoto(row: PhotoRow): BusinessPhoto {
  return {
    id: row.id,
    businessId: row.business_id,
    imageUrl: row.image_url,
    caption: row.caption,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listByBusiness(businessId: string, db: Queryable = pool): Promise<BusinessPhoto[]> {
  const result = await db.query<PhotoRow>(
    'SELECT * FROM business_photos WHERE business_id = $1 ORDER BY sort_order, created_at',
    [businessId],
  );
  return result.rows.map(toPhoto);
}

export async function countByBusiness(businessId: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>('SELECT count(*) FROM business_photos WHERE business_id = $1', [businessId]);
  return Number(result.rows[0].count);
}

/** Adds a photo at the end of the gallery. */
export async function insert(
  photo: { businessId: string; imageUrl: string; caption: string | null },
  db: Queryable = pool,
): Promise<BusinessPhoto> {
  const result = await db.query<PhotoRow>(
    `INSERT INTO business_photos (business_id, image_url, caption, sort_order)
     VALUES ($1, $2, $3, (SELECT coalesce(max(sort_order) + 1, 0) FROM business_photos WHERE business_id = $1))
     RETURNING *`,
    [photo.businessId, photo.imageUrl, photo.caption],
  );
  return toPhoto(result.rows[0]);
}

/** Deletes a photo of THIS business. Returns it (so its file can be removed), or null if not found. */
export async function deleteForBusiness(businessId: string, photoId: string, db: Queryable = pool): Promise<BusinessPhoto | null> {
  const result = await db.query<PhotoRow>(
    'DELETE FROM business_photos WHERE id = $1 AND business_id = $2 RETURNING *',
    [photoId, businessId],
  );
  return result.rows[0] ? toPhoto(result.rows[0]) : null;
}

/** Gives each photo its position in the list (0, 1, 2...). Only touches this business's photos. */
export async function setOrder(businessId: string, photoIds: string[], db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE business_photos p
        SET sort_order = o.position - 1
       FROM unnest($2::uuid[]) WITH ORDINALITY AS o(id, position)
      WHERE p.id = o.id AND p.business_id = $1`,
    [businessId, photoIds],
  );
}
