import type { Request, Response } from 'express';
import { idParamsSchema } from '../../../models/requests/common.requests';
import {
  createReservationSchema,
  customerReservationsQuerySchema,
  reservationMessageSchema,
} from '../../../models/requests/reservation.requests';
import * as reservationService from '../../../services/reservation.service';
import { currentUser } from '../../middleware/authenticate';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listReservations(req: Request, res: Response): Promise<void> {
  const query = parseRequest(customerReservationsQuerySchema, req.query);
  sendPage(res, await reservationService.listCustomerReservations(currentUser(req).id, query));
}

export async function createReservation(req: Request, res: Response): Promise<void> {
  const input = parseRequest(createReservationSchema, req.body);
  sendData(res, await reservationService.createReservation(currentUser(req), input), 201);
}

export async function getReservation(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await reservationService.getCustomerReservation(currentUser(req).id, id));
}

export async function cancelReservation(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { message } = parseRequest(reservationMessageSchema, req.body);
  sendData(res, await reservationService.cancelByCustomer(currentUser(req).id, id, message ?? null));
}
