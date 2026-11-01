import type { EmailJobStatus } from '../enums';

/** One row of the `email_jobs` table: one email waiting in (or done with) the queue. */
export interface EmailJob {
  id: string;
  toEmail: string;
  template: string;
  payload: Record<string, unknown>;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  /** Do not try before this moment (used to wait between retries). */
  runAt: Date;
  /** Set while a worker is sending this job. */
  lockedAt: Date | null;
  lastError: string | null;
  providerMessageId: string | null;
  dedupeKey: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
