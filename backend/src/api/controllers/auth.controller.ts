import type { Request, Response } from 'express';
import type { AuthResult } from '../../models/dto/user.dto';
import {
  forgotPasswordSchema,
  loginSchema,
  registerBusinessSchema,
  registerCustomerSchema,
  resetPasswordSchema,
  tokenSchema,
} from '../../models/requests/auth.requests';
import * as authService from '../../services/auth.service';
import { currentUser } from '../middleware/authenticate';
import { sendData } from '../responses';
import { clearSessionCookie, setSessionCookie } from '../session-cookie';
import { parseRequest } from '../validation';

/** Puts the session token in the cookie and returns only user info in the body. */
function sendAuthResult(res: Response, result: AuthResult, status: number): void {
  setSessionCookie(res, result.sessionToken);
  sendData(res, { user: result.user, ...(result.business ? { business: result.business } : {}) }, status);
}

export async function registerCustomer(req: Request, res: Response): Promise<void> {
  const input = parseRequest(registerCustomerSchema, req.body);
  sendAuthResult(res, await authService.registerCustomer(input), 201);
}

export async function registerBusiness(req: Request, res: Response): Promise<void> {
  const input = parseRequest(registerBusinessSchema, req.body);
  sendAuthResult(res, await authService.registerBusiness(input), 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = parseRequest(loginSchema, req.body);
  sendAuthResult(res, await authService.login(input), 200);
}

export function logout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  sendData(res, await authService.getCurrentUser(currentUser(req).id));
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = parseRequest(tokenSchema, req.body);
  sendData(res, { user: await authService.verifyEmail(token) });
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  await authService.resendVerificationEmail(currentUser(req).id);
  sendData(res, { message: 'A new confirmation email is on its way.' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = parseRequest(forgotPasswordSchema, req.body);
  await authService.requestPasswordReset(email);
  // Same answer whether or not the account exists.
  sendData(res, { message: 'If an account exists for this email, we sent a reset link.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = parseRequest(resetPasswordSchema, req.body);
  await authService.resetPassword(token, newPassword);
  sendData(res, { message: 'Password changed. Please log in.' });
}
