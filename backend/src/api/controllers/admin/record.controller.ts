import type { Request, Response } from 'express';
import { adminQuotesQuerySchema, adminReservationsQuerySchema } from '../../../models/requests/admin.requests';
import * as adminRecordsService from '../../../services/admin-records.service';
import { sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listReservations(req: Request, res: Response): Promise<void> {
  const query = parseRequest(adminReservationsQuerySchema, req.query);
  sendPage(res, await adminRecordsService.listReservations(query));
}

export async function listQuoteRequests(req: Request, res: Response): Promise<void> {
  const query = parseRequest(adminQuotesQuerySchema, req.query);
  sendPage(res, await adminRecordsService.listQuoteRequests(query));
}
