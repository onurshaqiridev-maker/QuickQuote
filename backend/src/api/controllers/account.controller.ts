import type { Request, Response } from 'express';
import { changePasswordSchema, updateProfileSchema } from '../../models/requests/account.requests';
import * as userService from '../../services/user.service';
import { currentUser } from '../middleware/authenticate';
import { sendData } from '../responses';
import { parseRequest } from '../validation';

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const input = parseRequest(updateProfileSchema, req.body);
  sendData(res, { user: await userService.updateProfile(currentUser(req).id, input) });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = parseRequest(changePasswordSchema, req.body);
  await userService.changePassword(currentUser(req).id, input);
  sendData(res, { message: 'Password changed.' });
}
