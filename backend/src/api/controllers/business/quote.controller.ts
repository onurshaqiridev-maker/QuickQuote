import type { Request, Response } from 'express';
import { idParamsSchema } from '../../../models/requests/common.requests';
import { businessQuotesQuerySchema, quoteMessageSchema, respondToQuoteSchema } from '../../../models/requests/quote.requests';
import * as quoteService from '../../../services/quote.service';
import { currentUser } from '../../middleware/authenticate';
import { currentBusinessId } from '../../middleware/load-business';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listQuotes(req: Request, res: Response): Promise<void> {
  const query = parseRequest(businessQuotesQuerySchema, req.query);
  sendPage(res, await quoteService.listBusinessQuotes(currentBusinessId(req), query));
}

export async function getQuote(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await quoteService.getBusinessQuote(currentBusinessId(req), id));
}

export async function start(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await quoteService.startQuote(currentBusinessId(req), id, currentUser(req).id));
}

export async function respond(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const input = parseRequest(respondToQuoteSchema, req.body);
  sendData(res, await quoteService.respondToQuote(currentBusinessId(req), id, currentUser(req).id, input));
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const { message } = parseRequest(quoteMessageSchema, req.body);
  sendData(res, await quoteService.rejectQuote(currentBusinessId(req), id, currentUser(req).id, message ?? null));
}
