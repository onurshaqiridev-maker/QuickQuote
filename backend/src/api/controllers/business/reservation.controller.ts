import type { Request, Response } from 'express';
import { idParamsSchema } from '../../../models/requests/common.requests';
import { businessReservationsQuerySchema, reservationMessageSchema } from '../../../models/requests/reservation.requests';
import * as reservationService from '../../../services/reservation.service';
import { currentUser } from '../../middleware/authenticate';
import { currentBusinessId } from '../../middleware/load-business';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listReservations(req: Request, res: Response): Promise<void> {
  const query = parseRequest(businessReservationsQuerySchema, req.query);
  sendPage(res, await reservationService.listBusinessReservations(currentBusinessId(req), query));
}

export async function getReservation(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await reservationService.getBusinessReservation(currentBusinessId(req), id));
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await reservationService.confirmReservation(currentBusinessId(req), id, currentUser(req).id));
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { message } = parseRequest(reservationMessageSchema, req.body);
  sendData(res, await reservationService.rejectReservation(currentBusinessId(req), id, currentUser(req).id, message ?? null));
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { message } = parseRequest(reservationMessageSchema, req.body);
  sendData(res, await reservationService.cancelByBusiness(currentBusinessId(req), id, currentUser(req).id, message ?? null));
}

export async function complete(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await reservationService.completeReservation(currentBusinessId(req), id, currentUser(req).id));
}
