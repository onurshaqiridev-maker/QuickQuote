import type { Request, Response } from 'express';
import { searchBusinessesQuerySchema, slugParamsSchema } from '../../../models/requests/discovery.requests';
import * as discoveryService from '../../../services/discovery.service';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function searchBusinesses(req: Request, res: Response): Promise<void> {
  const query = parseRequest(searchBusinessesQuerySchema, req.query);
  sendPage(res, await discoveryService.searchBusinesses(query));
}

export async function getBusiness(req: Request, res: Response): Promise<void> {
  const { slug } = parseRequest(slugParamsSchema, req.params);
  sendData(res, await discoveryService.getPublicBusiness(slug));
}

export async function listCities(_req: Request, res: Response): Promise<void> {
  sendData(res, await discoveryService.listCities());
}
