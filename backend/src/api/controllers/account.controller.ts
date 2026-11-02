import type { Request, Response } from 'express';
import { changePasswordSchema, updateProfileSchema } from '../../models/requests/account.requests';
import * as userService from '../../services/user.service';
import { currentUser } from '../middleware/authenticate';
import { sendData } from '../responses';
import { setSessionCookie } from '../session-cookie';
import { parseRequest } from '../validation';

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const input = parseRequest(updateProfileSchema, req.body);
  sendData(res, { user: await userService.updateProfile(currentUser(req).id, input) });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = parseRequest(changePasswordSchema, req.body);
  const { sessionToken } = await userService.changePassword(currentUser(req).id, input);
  setSessionCookie(res, sessionToken); // other devices are logged out; this one gets a fresh session
  sendData(res, { message: 'Password changed. You were logged out on your other devices.' });
}
