/** SQL for the admin overview: platform numbers and the activity feed. */
import type { AdminActivityRow, AdminCountsRow } from '../../models/dto/admin.dto';
import type { Page, PageQuery } from '../../models/dto/page.dto';
import type { UserRole } from '../../models/enums';
import { pool, type Queryable } from '../db';

export async function counts(db: Queryable = pool): Promise<AdminCountsRow> {
  const result = await db.query<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM users WHERE role = 'customer') AS customers,
      (SELECT count(*) FROM users WHERE role = 'business_owner') AS business_owners,
      (SELECT count(*) FROM users WHERE status <> 'active') AS suspended_users,
      (SELECT count(*) FROM businesses WHERE status = 'pending_review') AS pending_review,
      (SELECT count(*) FROM businesses WHERE status = 'approved') AS approved,
      (SELECT count(*) FROM businesses WHERE status = 'suspended') AS suspended,
      (SELECT count(*) FROM businesses WHERE status = 'deactivated') AS deactivated,
      (SELECT count(*) FROM reservations WHERE created_at > now() - interval '7 days') AS reservations_week,
      (SELECT count(*) FROM reservations WHERE status = 'pending' AND ends_at > now()) AS reservations_pending,
      (SELECT count(*) FROM quote_requests WHERE created_at > now() - interval '7 days') AS quotes_week,
      (SELECT count(*) FROM quote_requests WHERE status IN ('pending', 'processing')) AS quotes_open`);
  const row = result.rows[0];
  const n = (key: string) => Number(row[key]);
  return {
    customers: n('customers'),
    businessOwners: n('business_owners'),
    suspendedUsers: n('suspended_users'),
    businesses: { pending_review: n('pending_review'), approved: n('approved'), suspended: n('suspended'), deactivated: n('deactivated') },
    reservationsThisWeek: n('reservations_week'),
    pendingReservations: n('reservations_pending'),
    quotesThisWeek: n('quotes_week'),
    openQuotes: n('quotes_open'),
  };
}

interface ActivityRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: UserRole | null;
}

/**
 * Newest first. `entity_label` gives each event a readable name, looked up from the table it is about.
 * The label is empty if that row no longer exists.
 */
export async function listActivity(page: PageQuery, db: Queryable = pool): Promise<Page<AdminActivityRow>> {
  const [rows, count] = await Promise.all([
    db.query<ActivityRow>(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
              u.id AS actor_id, u.full_name AS actor_name, u.role AS actor_role,
              CASE a.entity_type
                WHEN 'business' THEN (SELECT p.display_name FROM business_profiles p WHERE p.business_id = a.entity_id)
                WHEN 'user' THEN (SELECT x.full_name FROM users x WHERE x.id = a.entity_id)
                WHEN 'reservation' THEN (
                  SELECT r.service_name || ' at ' || p.display_name
                    FROM reservations r JOIN business_profiles p ON p.business_id = r.business_id WHERE r.id = a.entity_id)
                WHEN 'quote_request' THEN (
                  SELECT q.subject || ' (' || p.display_name || ')'
                    FROM quote_requests q JOIN business_profiles p ON p.business_id = q.business_id WHERE q.id = a.entity_id)
                WHEN 'category' THEN (SELECT c.name FROM categories c WHERE c.id = a.entity_id)
              END AS entity_label
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.actor_user_id
        ORDER BY a.created_at DESC, a.id
        LIMIT $1 OFFSET $2`,
      [page.pageSize, (page.page - 1) * page.pageSize],
    ),
    db.query<{ count: string }>('SELECT count(*) FROM activity_logs'),
  ]);
  return {
    items: rows.rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityLabel: row.entity_label,
      metadata: row.metadata,
      createdAt: row.created_at,
      actor: row.actor_id && row.actor_name && row.actor_role ? { id: row.actor_id, fullName: row.actor_name, role: row.actor_role } : null,
    })),
    total: Number(count.rows[0].count),
    page: page.page,
    pageSize: page.pageSize,
  };
}
