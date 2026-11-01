import type { Request, Response } from 'express';
import { contactMessageSchema } from '../../../models/requests/contact.requests';
import * as contactService from '../../../services/contact.service';
import { sendData } from '../../responses';
import { parseRequest } from '../../validation';

/** POST /api/contact - the email is QUEUED (202 Accepted), the worker sends it a few seconds later. */
export async function sendContactMessage(req: Request, res: Response): Promise<void> {
  const input = parseRequest(contactMessageSchema, req.body);
  await contactService.sendContactMessage(input);
  sendData(res, { message: "Thanks! Your message was received and we'll reply soon." }, 202);
}
