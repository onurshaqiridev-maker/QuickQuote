/** Admin tools for the email queue: list jobs, see counts, retry failed jobs. */
import * as emailJobRepository from '../../data/repositories/email-job.repository';
import type { Page } from '../../models/dto/page.dto';
import { DomainError, NotFoundError } from '../../models/errors';
import type { ListEmailJobsQuery } from '../../models/requests/email-job.requests';
import type { EmailJobResponse, EmailQueueStatsResponse } from '../../models/responses/email-job.response';
import { toEmailJobResponse } from '../mappers';

export async function listEmailJobs(query: ListEmailJobsQuery): Promise<Page<EmailJobResponse>> {
  const page = await emailJobRepository.list(query);
  return { ...page, items: page.items.map(toEmailJobResponse) };
}

export async function getEmailQueueStats(): Promise<EmailQueueStatsResponse> {
  return emailJobRepository.countByStatus();
}

/** Puts a failed job back in the queue with fresh attempts. */
export async function retryEmailJob(id: string): Promise<EmailJobResponse> {
  const job = await emailJobRepository.resetFailed(id);
  if (job) return toEmailJobResponse(job);

  const existing = await emailJobRepository.findById(id);
  if (!existing) throw new NotFoundError('Email job not found.');
  throw new DomainError(
    'INVALID_STATUS_TRANSITION',
    `Only failed email jobs can be retried (this one is "${existing.status}").`,
  );
}
