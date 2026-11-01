import type { EmailJobStatus } from '../enums';

/**
 * An email job as shown to admins.
 * The payload is NOT included: it can contain private links (password reset tokens).
 */
export interface EmailJobResponse {
  id: string;
  toEmail: string;
  template: string;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailQueueStatsResponse {
  pending: number;
  sent: number;
  failed: number;
}
