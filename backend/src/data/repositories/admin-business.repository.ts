/** SQL for the admin's business list and details. */
import type { AdminBusinessRow } from '../../models/dto/admin.dto';
import type { Page, PageQuery } from '../../models/dto/page.dto';
import type { BusinessStatus } from '../../models/enums';
import { pool, type Queryable } from '../db';

interface Row {
  id: string;
  display_name: string;
  slug: string;
  city: string | null;
  status: BusinessStatus;
  is_published: boolean;
  active_services: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  owner_email_verified: boolean;
  created_at: Date;
}

function toRow(row: Row): AdminBusinessRow {
  return {
    id: row.id,
    displayName: row.display_name,
    slug: row.slug,
    city: row.city,
    status: row.status,
    isPublished: row.is_published,
    activeServices: Number(row.active_services),
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerPhone: row.owner_phone,
    ownerEmailVerified: row.owner_email_verified,
    createdAt: row.created_at,
  };
}

/** Turns user text into a safe LIKE pattern: "50%_off" must not act as wildcards. */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

const SELECT = `
  SELECT b.id, p.display_name, p.slug, p.city, b.status, p.is_published, b.created_at,
         (SELECT count(*) FROM services s WHERE s.business_id = b.id AND s.is_active) AS active_services,
         u.id AS owner_id, u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone,
         (u.email_verified_at IS NOT NULL) AS owner_email_verified
    FROM businesses b
    JOIN business_profiles p ON p.business_id = b.id
    JOIN users u ON u.id = b.owner_user_id`;

/** Newest first. `search` matches the business name, owner name or owner email. */
export async function list(
  filter: { status?: BusinessStatus; search?: string } & PageQuery,
  db: Queryable = pool,
): Promise<Page<AdminBusinessRow>> {
  const where = `
    WHERE ($1::text IS NULL OR b.status = $1)
      AND ($2::text IS NULL OR p.display_name ILIKE $2 OR u.full_name ILIKE $2 OR u.email ILIKE $2)`;
  const params = [filter.status ?? null, filter.search ? containsPattern(filter.search) : null];
  const [rows, count] = await Promise.all([
    db.query<Row>(`${SELECT} ${where} ORDER BY b.created_at DESC LIMIT $3 OFFSET $4`, [
      ...params,
      filter.pageSize,
      (filter.page - 1) * filter.pageSize,
    ]),
    db.query<{ count: string }>(
      `SELECT count(*) FROM businesses b
         JOIN business_profiles p ON p.business_id = b.id
         JOIN users u ON u.id = b.owner_user_id ${where}`,
      params,
    ),
  ]);
  return { items: rows.rows.map(toRow), total: Number(count.rows[0].count), page: filter.page, pageSize: filter.pageSize };
}

export async function findById(id: string, db: Queryable = pool): Promise<AdminBusinessRow | null> {
  const result = await db.query<Row>(`${SELECT} WHERE b.id = $1`, [id]);
  return result.rows[0] ? toRow(result.rows[0]) : null;
}
