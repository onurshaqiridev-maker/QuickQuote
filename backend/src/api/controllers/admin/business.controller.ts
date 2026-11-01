import type { Request, Response } from 'express';
import { listBusinessesQuerySchema, statusReasonSchema } from '../../../models/requests/admin.requests';
import { idParamsSchema } from '../../../models/requests/common.requests';
import * as adminBusinessService from '../../../services/admin-business.service';
import { currentUser } from '../../middleware/authenticate';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listBusinesses(req: Request, res: Response): Promise<void> {
  const query = parseRequest(listBusinessesQuerySchema, req.query);
  sendPage(res, await adminBusinessService.listBusinesses(query));
}

export async function getBusiness(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await adminBusinessService.getBusinessDetail(id));
}

export async function approve(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await adminBusinessService.changeBusinessStatus(id, 'approve', currentUser(req).id));
}

export async function reactivate(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await adminBusinessService.changeBusinessStatus(id, 'reactivate', currentUser(req).id));
}

export async function suspend(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { reason } = parseRequest(statusReasonSchema, req.body);
  sendData(res, await adminBusinessService.changeBusinessStatus(id, 'suspend', currentUser(req).id, reason));
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { reason } = parseRequest(statusReasonSchema, req.body);
  sendData(res, await adminBusinessService.changeBusinessStatus(id, 'deactivate', currentUser(req).id, reason));
}
