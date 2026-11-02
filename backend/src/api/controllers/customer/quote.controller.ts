import type { Request, Response } from 'express';
import { idParamsSchema } from '../../../models/requests/common.requests';
import { createQuoteRequestSchema, customerQuotesQuerySchema } from '../../../models/requests/quote.requests';
import * as quoteService from '../../../services/quote.service';
import { currentUser } from '../../middleware/authenticate';
import { sendData, sendPage } from '../../responses';
import { parseRequest } from '../../validation';

export async function listQuotes(req: Request, res: Response): Promise<void> {
  const query = parseRequest(customerQuotesQuerySchema, req.query);
  sendPage(res, await quoteService.listCustomerQuotes(currentUser(req).id, query));
}

export async function createQuote(req: Request, res: Response): Promise<void> {
  const input = parseRequest(createQuoteRequestSchema, req.body);
  sendData(res, await quoteService.createQuoteRequest(currentUser(req), input), 201);
}

export async function getQuote(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await quoteService.getCustomerQuote(currentUser(req).id, id));
}

export async function accept(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await quoteService.decideQuote(currentUser(req).id, id, 'accepted'));
}

export async function decline(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  sendData(res, await quoteService.decideQuote(currentUser(req).id, id, 'declined'));
}
