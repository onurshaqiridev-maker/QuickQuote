import type { Request, Response } from 'express';
import { listUsersQuerySchema, statusReasonSchema } from '../../../models/requests/admin.requests';
import { idParamsSchema } from '../../../models/requests/common.requests';
import * as adminUserService from '../../../services/admin-user.service';
import { currentUser } from '../../middleware/authenticate';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = parseRequest(listUsersQuerySchema, req.query);
  sendPage(res, await adminUserService.listUsers(query));
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await adminUserService.getUser(id));
}

export async function suspend(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { reason } = parseRequest(statusReasonSchema, req.body);
  sendData(res, await adminUserService.suspendUser(currentUser(req).id, id, reason));
}

export async function reactivate(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await adminUserService.reactivateUser(currentUser(req).id, id));
}
