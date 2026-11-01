/** Test helpers that talk to the test database directly (tests are not part of the app's layers). */
import { pool } from '../../src/data/db';

export async function resetDatabase(): Promise<void> {
  await pool.query(`
    TRUNCATE activity_logs, email_jobs, payments, subscriptions, subscription_plans, quote_requests,
             reservations, blocked_times, working_hours, services, business_photos,
             business_category_links, business_profiles, businesses, categories, auth_tokens, users
    RESTART IDENTITY CASCADE`);
}

export async function createCategory(name = 'Beauty & Wellness', slug = 'beauty-wellness'): Promise<string> {
  const result = await pool.query<{ id: string }>(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
    [name, slug],
  );
  return result.rows[0].id;
}

export interface EmailJobRow {
  id: string;
  to_email: string;
  template: string;
  payload: Record<string, string>;
  status: string;
  attempts: number;
  run_at: Date;
  last_error: string | null;
}

export async function emailJobs(): Promise<EmailJobRow[]> {
  const result = await pool.query<EmailJobRow>('SELECT * FROM email_jobs ORDER BY created_at, template');
  return result.rows;
}

/** Pretend the retry wait is over: make every pending job due now. */
export async function makePendingJobsDue(): Promise<void> {
  await pool.query("UPDATE email_jobs SET run_at = now() WHERE status = 'pending'");
}

/** Reads the token from a link like http://localhost:5173/verify-email?token=abc */
export function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get('token');
  if (!token) throw new Error(`No token in ${url}`);
  return token;
}

export { pool };
