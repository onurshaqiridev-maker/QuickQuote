/**
 * All SQL for the email queue (`email_jobs` table).
 *
 * Life of a job:  pending  ->  sent
 *                 pending  ->  pending (retry later)  ->  ...  ->  failed
 */
import type { NewEmailJob } from '../../models/dto/email.dto';
import type { Page, PageQuery } from '../../models/dto/page.dto';
import type { EmailJob } from '../../models/entities/email-job.entity';
import type { EmailJobStatus } from '../../models/enums';
import { pool, type Queryable } from '../db';

interface EmailJobRow {
  id: string;
  to_email: string;
  template: string;
  payload: Record<string, unknown>;
  status: EmailJobStatus;
  attempts: number;
  max_attempts: number;
  run_at: Date;
  locked_at: Date | null;
  last_error: string | null;
  provider_message_id: string | null;
  dedupe_key: string | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toEmailJob(row: EmailJobRow): EmailJob {
  return {
    id: row.id,
    toEmail: row.to_email,
    template: row.template,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    runAt: row.run_at,
    lockedAt: row.locked_at,
    lastError: row.last_error,
    providerMessageId: row.provider_message_id,
    dedupeKey: row.dedupe_key,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Error messages can be long; keep the database tidy. */
function shorten(message: string): string {
  return message.length > 1000 ? `${message.slice(0, 997)}...` : message;
}

/**
 * Adds a job to the queue (status `pending`).
 * If a job with the same `dedupeKey` already exists, nothing happens.
 * Pass the transaction (`db`) so the job is saved together with the change that caused it.
 */
export async function insert(job: NewEmailJob, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO email_jobs (to_email, template, payload, max_attempts, dedupe_key, run_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [job.toEmail, job.template, job.payload, job.maxAttempts, job.dedupeKey, job.runAt],
  );
}

/**
 * Claims up to `limit` jobs that are due, so this worker can send them.
 *
 * - `FOR UPDATE SKIP LOCKED`: if two workers run at once, each skips the rows the other took.
 * - A job whose lock is older than `lockTimeoutMinutes` (its worker crashed) can be claimed again.
 * - The attempt is counted now, so a crash in the middle still counts as an attempt.
 */
export async function claimDue(limit: number, lockTimeoutMinutes: number, db: Queryable = pool): Promise<EmailJob[]> {
  const result = await db.query<EmailJobRow>(
    `UPDATE email_jobs
        SET locked_at = now(),
            attempts  = attempts + 1
      WHERE id IN (
        SELECT id
          FROM email_jobs
         WHERE status = 'pending'
           AND run_at <= now()
           AND (locked_at IS NULL OR locked_at < now() - make_interval(mins => $2))
         ORDER BY run_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING *`,
    [limit, lockTimeoutMinutes],
  );
  return result.rows.map(toEmailJob).sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
}

/** Resend accepted the email. */
export async function markSent(id: string, providerMessageId: string | null, db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE email_jobs
        SET status = 'sent', sent_at = now(), provider_message_id = $2, last_error = NULL, locked_at = NULL
      WHERE id = $1`,
    [id, providerMessageId],
  );
}

/** Sending failed but attempts are left: stay `pending` and try again after `delayMinutes`. */
export async function scheduleRetry(
  id: string,
  delayMinutes: number,
  errorMessage: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE email_jobs
        SET run_at = now() + make_interval(mins => $2), last_error = $3, locked_at = NULL
      WHERE id = $1`,
    [id, delayMinutes, shorten(errorMessage)],
  );
}

/** Sending failed and no attempts are left. */
export async function markFailed(id: string, errorMessage: string, db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE email_jobs
        SET status = 'failed', last_error = $2, locked_at = NULL
      WHERE id = $1`,
    [id, shorten(errorMessage)],
  );
}

/** Admin "Retry": puts a FAILED job back in the queue with fresh attempts. Returns null if not possible. */
export async function resetFailed(id: string, db: Queryable = pool): Promise<EmailJob | null> {
  const result = await db.query<EmailJobRow>(
    `UPDATE email_jobs
        SET status = 'pending', attempts = 0, run_at = now(), locked_at = NULL
      WHERE id = $1 AND status = 'failed'
      RETURNING *`,
    [id],
  );
  return result.rows[0] ? toEmailJob(result.rows[0]) : null;
}

export async function findById(id: string, db: Queryable = pool): Promise<EmailJob | null> {
  const result = await db.query<EmailJobRow>('SELECT * FROM email_jobs WHERE id = $1', [id]);
  return result.rows[0] ? toEmailJob(result.rows[0]) : null;
}

/** Newest jobs first, optionally only one status. */
export async function list(
  filter: { status?: EmailJobStatus } & PageQuery,
  db: Queryable = pool,
): Promise<Page<EmailJob>> {
  const status = filter.status ?? null;
  const offset = (filter.page - 1) * filter.pageSize;
  const [rows, count] = await Promise.all([
    db.query<EmailJobRow>(
      `SELECT * FROM email_jobs
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [status, filter.pageSize, offset],
    ),
    db.query<{ count: string }>('SELECT count(*) FROM email_jobs WHERE ($1::text IS NULL OR status = $1)', [status]),
  ]);
  return {
    items: rows.rows.map(toEmailJob),
    total: Number(count.rows[0].count),
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

/** Number of jobs per status, e.g. { pending: 2, sent: 140, failed: 1 }. */
export async function countByStatus(db: Queryable = pool): Promise<Record<EmailJobStatus, number>> {
  const result = await db.query<{ status: EmailJobStatus; count: string }>(
    'SELECT status, count(*) FROM email_jobs GROUP BY status',
  );
  const counts: Record<EmailJobStatus, number> = { pending: 0, sent: 0, failed: 0 };
  for (const row of result.rows) counts[row.status] = Number(row.count);
  return counts;
}
