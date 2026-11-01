/**
 * THE ONLY WAY business logic sends an email: put a job in the queue.
 *
 * HTTP endpoints never talk to Resend. A service calls `enqueueEmail(...)` (ideally inside
 * the same transaction as the change that caused the email), the API answers immediately,
 * and the background worker delivers the email a few seconds later.
 */
import { env } from '../../config/env';
import type { Transaction } from '../../data/db';
import * as emailJobRepository from '../../data/repositories/email-job.repository';
import type { EmailTemplateName, EnqueueEmailInput } from '../../models/dto/email.dto';
import { isKnownTemplate } from './templates';

export async function enqueueEmail<T extends EmailTemplateName>(
  input: EnqueueEmailInput<T>,
  tx?: Transaction,
): Promise<void> {
  if (!isKnownTemplate(input.template)) {
    throw new Error(`Unknown email template "${input.template}"`);
  }
  await emailJobRepository.insert(
    {
      toEmail: input.to.trim().toLowerCase(),
      template: input.template,
      payload: { ...input.payload },
      maxAttempts: env.EMAIL_MAX_ATTEMPTS,
      dedupeKey: input.dedupeKey ?? null,
      runAt: input.runAt ?? null,
    },
    tx,
  );
}
