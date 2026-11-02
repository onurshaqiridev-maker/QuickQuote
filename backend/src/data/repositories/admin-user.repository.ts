/** SQL for the admin's user list (customers, business owners and admins). */
import type { AdminUserRow, UserStatusChange } from '../../models/dto/admin.dto';
import type { Page, PageQuery } from '../../models/dto/page.dto';
import type { BusinessStatus, UserRole, UserStatus } from '../../models/enums';
import { pool, type Queryable } from '../db';
import { containsPattern } from '../search-pattern';

interface Row {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  status_reason: string | null;
  email_verified: boolean;
  created_at: Date;
  last_login_at: Date | null;
  reservation_count: string;
  quote_count: string;
  business_id: string | null;
  business_name: string | null;
  business_status: BusinessStatus | null;
}

function toRow(row: Row): AdminUserRow {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    statusReason: row.status_reason,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    reservationCount: Number(row.reservation_count),
    quoteCount: Number(row.quote_count),
    business: row.business_id && row.business_name && row.business_status
      ? { id: row.business_id, displayName: row.business_name, status: row.business_status }
      : null,
  };
}

const SELECT = `
  SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.status_reason, u.created_at, u.last_login_at,
         (u.email_verified_at IS NOT NULL) AS email_verified,
         (SELECT count(*) FROM reservations r WHERE r.customer_id = u.id) AS reservation_count,
         (SELECT count(*) FROM quote_requests q WHERE q.customer_id = u.id) AS quote_count,
         b.id AS business_id, p.display_name AS business_name, b.status AS business_status
    FROM users u
    LEFT JOIN businesses b ON b.owner_user_id = u.id
    LEFT JOIN business_profiles p ON p.business_id = b.id`;

/** Newest first. `search` matches the name or email. */
export async function list(
  filter: { role?: UserRole; status?: UserStatus; search?: string } & PageQuery,
  db: Queryable = pool,
): Promise<Page<AdminUserRow>> {
  const where = `
    WHERE ($1::text IS NULL OR u.role = $1)
      AND ($2::text IS NULL OR u.status = $2)
      AND ($3::text IS NULL OR u.full_name ILIKE $3 OR u.email ILIKE $3)`;
  const params = [filter.role ?? null, filter.status ?? null, filter.search ? containsPattern(filter.search) : null];
  const [rows, count] = await Promise.all([
    db.query<Row>(`${SELECT} ${where} ORDER BY u.created_at DESC, u.id LIMIT $4 OFFSET $5`, [
      ...params,
      filter.pageSize,
      (filter.page - 1) * filter.pageSize,
    ]),
    db.query<{ count: string }>(`SELECT count(*) FROM users u ${where}`, params),
  ]);
  return { items: rows.rows.map(toRow), total: Number(count.rows[0].count), page: filter.page, pageSize: filter.pageSize };
}

export async function findById(id: string, db: Queryable = pool): Promise<AdminUserRow | null> {
  const result = await db.query<Row>(`${SELECT} WHERE u.id = $1`, [id]);
  return result.rows[0] ? toRow(result.rows[0]) : null;
}

/** Changes the status only if it is currently one of `from` (checked inside the UPDATE). Returns false if not allowed. */
export async function changeStatus(id: string, change: UserStatusChange, db: Queryable = pool): Promise<boolean> {
  const result = await db.query(
    'UPDATE users SET status = $2, status_reason = $3 WHERE id = $1 AND status = ANY($4::text[])',
    [id, change.to, change.reason, change.from],
  );
  return (result.rowCount ?? 0) > 0;
}
