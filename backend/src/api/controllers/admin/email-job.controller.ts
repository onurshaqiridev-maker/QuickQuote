import type { Request, Response } from 'express';
import { idParamsSchema } from '../../../models/requests/common.requests';
import { listEmailJobsQuerySchema } from '../../../models/requests/email-job.requests';
import * as emailAdminService from '../../../services/email/email-admin.service';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listEmailJobs(req: Request, res: Response): Promise<void> {
  const query = parseRequest(listEmailJobsQuerySchema, req.query);
  sendPage(res, await emailAdminService.listEmailJobs(query));
}

export async function getEmailQueueStats(_req: Request, res: Response): Promise<void> {
  sendData(res, await emailAdminService.getEmailQueueStats());
}

export async function retryEmailJob(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await emailAdminService.retryEmailJob(id));
}
