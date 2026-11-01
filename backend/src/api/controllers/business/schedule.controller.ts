import type { Request, Response } from 'express';
import { blockedTimeSchema, workingHoursSchema } from '../../../models/requests/business.requests';
import { idParamsSchema } from '../../../models/requests/common.requests';
import * as scheduleService from '../../../services/schedule.service';
import { currentBusinessId } from '../../middleware/load-business';
import { sendData } from '../../responses';
import { parseRequest } from '../../validation';

export async function getWorkingHours(req: Request, res: Response): Promise<void> {
  sendData(res, await scheduleService.getWorkingHours(currentBusinessId(req)));
}

export async function replaceWorkingHours(req: Request, res: Response): Promise<void> {
  const input = parseRequest(workingHoursSchema, req.body);
  sendData(res, await scheduleService.replaceWorkingHours(currentBusinessId(req), input));
}

export async function listBlockedTimes(req: Request, res: Response): Promise<void> {
  sendData(res, await scheduleService.listBlockedTimes(currentBusinessId(req)));
}

export async function addBlockedTime(req: Request, res: Response): Promise<void> {
  const input = parseRequest(blockedTimeSchema, req.body);
  sendData(res, await scheduleService.addBlockedTime(currentBusinessId(req), input), 201);
}

export async function deleteBlockedTime(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  await scheduleService.deleteBlockedTime(currentBusinessId(req), id);
  res.status(204).end();
}
