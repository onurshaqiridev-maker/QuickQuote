/** SQL for `working_hours` and `blocked_times`. */
import type { BlockedTime, WorkingHoursRange } from '../../models/entities/schedule.entity';
import { pool, type Queryable } from '../db';

interface WorkingHoursRow {
  id: string;
  business_id: string;
  day_of_week: number;
  start_time: string; // PostgreSQL returns "09:00:00"
  end_time: string;
}

interface BlockedTimeRow {
  id: string;
  business_id: string;
  starts_at: Date;
  ends_at: Date;
  reason: string | null;
  created_at: Date;
}

function toRange(row: WorkingHoursRow): WorkingHoursRange {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
  };
}

function toBlockedTime(row: BlockedTimeRow): BlockedTime {
  return {
    id: row.id,
    businessId: row.business_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export async function listWorkingHours(businessId: string, db: Queryable = pool): Promise<WorkingHoursRange[]> {
  const result = await db.query<WorkingHoursRow>(
    'SELECT * FROM working_hours WHERE business_id = $1 ORDER BY day_of_week, start_time',
    [businessId],
  );
  return result.rows.map(toRange);
}

/** Replaces the whole week: delete the old ranges, insert the new ones. Use inside a transaction. */
export async function replaceWorkingHours(
  businessId: string,
  ranges: { dayOfWeek: number; startTime: string; endTime: string }[],
  db: Queryable = pool,
): Promise<void> {
  await db.query('DELETE FROM working_hours WHERE business_id = $1', [businessId]);
  if (ranges.length === 0) return;
  await db.query(
    `INSERT INTO working_hours (business_id, day_of_week, start_time, end_time)
     SELECT $1, d, s::time, e::time
       FROM unnest($2::smallint[], $3::text[], $4::text[]) AS t(d, s, e)`,
    [businessId, ranges.map((r) => r.dayOfWeek), ranges.map((r) => r.startTime), ranges.map((r) => r.endTime)],
  );
}

/** Blocked periods that have not ended yet, soonest first. */
export async function listUpcomingBlockedTimes(businessId: string, db: Queryable = pool): Promise<BlockedTime[]> {
  const result = await db.query<BlockedTimeRow>(
    'SELECT * FROM blocked_times WHERE business_id = $1 AND ends_at > now() ORDER BY starts_at',
    [businessId],
  );
  return result.rows.map(toBlockedTime);
}

export async function insertBlockedTime(
  blocked: { businessId: string; startsAt: Date; endsAt: Date; reason: string | null },
  db: Queryable = pool,
): Promise<BlockedTime> {
  const result = await db.query<BlockedTimeRow>(
    'INSERT INTO blocked_times (business_id, starts_at, ends_at, reason) VALUES ($1, $2, $3, $4) RETURNING *',
    [blocked.businessId, blocked.startsAt, blocked.endsAt, blocked.reason],
  );
  return toBlockedTime(result.rows[0]);
}

export async function deleteBlockedTime(businessId: string, id: string, db: Queryable = pool): Promise<boolean> {
  const result = await db.query('DELETE FROM blocked_times WHERE id = $1 AND business_id = $2', [id, businessId]);
  return (result.rowCount ?? 0) > 0;
}

/** Blocked periods of a business that overlap [from, to). */
export async function listBlockedBetween(businessId: string, from: Date, to: Date, db: Queryable = pool): Promise<{ start: Date; end: Date }[]> {
  const result = await db.query<{ starts_at: Date; ends_at: Date }>(
    'SELECT starts_at, ends_at FROM blocked_times WHERE business_id = $1 AND starts_at < $3 AND ends_at > $2',
    [businessId, from, to],
  );
  return result.rows.map((row) => ({ start: row.starts_at, end: row.ends_at }));
}
