import type { Request, Response } from 'express';
import { activityQuerySchema } from '../../../models/requests/admin.requests';
import * as adminOverviewService from '../../../services/admin-overview.service';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function getStats(_req: Request, res: Response): Promise<void> {
  sendData(res, await adminOverviewService.getStats());
}

export async function listActivity(req: Request, res: Response): Promise<void> {
  const query = parseRequest(activityQuerySchema, req.query);
  sendPage(res, await adminOverviewService.listActivity(query));
}
