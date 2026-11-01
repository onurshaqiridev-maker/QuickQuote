import type { Request, Response } from 'express';
import { offeringSchema } from '../../../models/requests/business.requests';
import { idParamsSchema } from '../../../models/requests/common.requests';
import * as offeringService from '../../../services/offering.service';
import { currentBusinessId } from '../../middleware/load-business';
import { sendData } from '../../responses';
import { parseRequest } from '../../validation';

export async function listServices(req: Request, res: Response): Promise<void> {
  sendData(res, await offeringService.listOfferings(currentBusinessId(req)));
}

export async function createService(req: Request, res: Response): Promise<void> {
  const input = parseRequest(offeringSchema, req.body);
  sendData(res, await offeringService.createOffering(currentBusinessId(req), input), 201);
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const input = parseRequest(offeringSchema, req.body);
  sendData(res, await offeringService.updateOffering(currentBusinessId(req), id, input));
}

export async function archiveService(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await offeringService.archiveOffering(currentBusinessId(req), id));
}
