/**
 * The background email worker: takes due jobs from the queue and sends them.
 *
 *   success                 -> status "sent"
 *   failure, attempts left  -> stays "pending", tried again later (see RETRY_DELAYS_MINUTES)
 *   failure, no attempts    -> status "failed"
 *
 * With EMAIL_MAX_ATTEMPTS=5 every email gets 1 first try + 4 retries.
 */
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import * as emailJobRepository from '../../data/repositories/email-job.repository';
import type { EmailBatchResult } from '../../models/dto/email.dto';
import type { EmailJob } from '../../models/entities/email-job.entity';
import { getEmailSender, type EmailSender } from './senders';
import { renderEmail } from './templates';

/** How long to wait after the 1st, 2nd, 3rd, 4th failed attempt (later failures wait 60 min). */
export const RETRY_DELAYS_MINUTES = [1, 5, 15, 60] as const;

/** Minutes to wait before the next try, after attempt number `failedAttempt` failed. */
export function retryDelayMinutes(failedAttempt: number): number {
  const index = Math.min(Math.max(failedAttempt, 1), RETRY_DELAYS_MINUTES.length) - 1;
  return RETRY_DELAYS_MINUTES[index];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Rejects if `promise` takes longer than `ms` (so a hanging provider counts as a failed attempt). */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Email provider did not answer within ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

type JobOutcome = 'sent' | 'retried' | 'failed';

async function processJob(job: EmailJob, sender: EmailSender): Promise<JobOutcome> {
  const context = { emailJobId: job.id, template: job.template, attempt: job.attempts, maxAttempts: job.maxAttempts };
  try {
    const rendered = renderEmail(job.template, job.payload);
    const result = await withTimeout(
      sender.send({
        to: job.toEmail,
        ...rendered,
        idempotencyKey: `email-job/${job.id}/attempt-${job.attempts}`,
      }),
      env.EMAIL_SEND_TIMEOUT_MS,
    );
    await emailJobRepository.markSent(job.id, result.providerMessageId);
    logger.info({ ...context, result: 'sent' }, 'Email sent');
    return 'sent';
  } catch (error) {
    const message = errorMessage(error);
    if (job.attempts >= job.maxAttempts) {
      await emailJobRepository.markFailed(job.id, message);
      logger.error({ ...context, result: 'failed', error: message }, 'Email failed permanently');
      return 'failed';
    }
    const delay = retryDelayMinutes(job.attempts);
    await emailJobRepository.scheduleRetry(job.id, delay, message);
    logger.warn({ ...context, result: 'retry', retryInMinutes: delay, error: message }, 'Email failed, will retry');
    return 'retried';
  }
}

/** Claims due jobs and sends them one by one. Returns how many were sent / retried / failed. */
export async function processEmailBatch(sender: EmailSender = getEmailSender()): Promise<EmailBatchResult> {
  const jobs = await emailJobRepository.claimDue(env.EMAIL_BATCH_SIZE, env.EMAIL_LOCK_TIMEOUT_MINUTES);
  const result: EmailBatchResult = { claimed: jobs.length, sent: 0, retried: 0, failed: 0 };
  for (const job of jobs) {
    const outcome = await processJob(job, sender);
    result[outcome] += 1;
  }
  return result;
}

export interface RunningWorker {
  /** Stops taking new batches and waits for the current batch to finish. */
  stop(): Promise<void>;
}

/** Starts the worker loop: every EMAIL_POLL_INTERVAL_MS, process one batch. */
export function startEmailWorker(sender: EmailSender = getEmailSender()): RunningWorker {
  let stopped = false;
  let currentBatch: Promise<void> | null = null;

  const tick = () => {
    // Skip this tick if we are stopping or the previous batch is still running.
    if (stopped || currentBatch) return;
    currentBatch = processEmailBatch(sender)
      .then((result) => {
        if (result.claimed > 0) logger.info(result, 'Email batch finished');
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Email batch crashed (will try again on the next tick)');
      })
      .finally(() => {
        currentBatch = null;
      });
  };

  const timer = setInterval(tick, env.EMAIL_POLL_INTERVAL_MS);
  tick();
  logger.info(
    { driver: sender.name, pollIntervalMs: env.EMAIL_POLL_INTERVAL_MS, maxAttempts: env.EMAIL_MAX_ATTEMPTS },
    'Email worker started',
  );

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      if (currentBatch) await currentBatch;
      logger.info('Email worker stopped');
    },
  };
}
