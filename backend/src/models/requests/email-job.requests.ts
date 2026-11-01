import { z } from 'zod';
import { EMAIL_JOB_STATUSES } from '../enums';
import { pageQueryShape } from './common.requests';

export const listEmailJobsQuerySchema = z.object({
  status: z.enum(EMAIL_JOB_STATUSES, { error: 'Status must be pending, sent or failed.' }).optional(),
  ...pageQueryShape,
});
export type ListEmailJobsQuery = z.infer<typeof listEmailJobsQuerySchema>;
