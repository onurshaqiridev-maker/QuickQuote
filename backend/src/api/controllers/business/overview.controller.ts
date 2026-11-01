import type { Request, Response } from 'express';
import { bookingSettingsSchema } from '../../../models/requests/business.requests';
import * as businessService from '../../../services/business.service';
import { currentBusinessId } from '../../middleware/load-business';
import { sendData } from '../../responses';
import { parseRequest } from '../../validation';

export async function getOverview(req: Request, res: Response): Promise<void> {
  sendData(res, await businessService.getOverview(currentBusinessId(req)));
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  sendData(res, await businessService.getBookingSettings(currentBusinessId(req)));
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const input = parseRequest(bookingSettingsSchema, req.body);
  sendData(res, await businessService.updateBookingSettings(currentBusinessId(req), input));
}
