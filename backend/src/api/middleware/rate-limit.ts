/**
 * Rate limits protect against spam and password guessing.
 * They are switched off in automated tests.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../../config/env';

function limiter(windowMinutes: number, limit: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' },
      });
    },
  });
}

export const generalLimiter = limiter(15, 300);
export const loginLimiter = limiter(15, 10);
export const registerLimiter = limiter(60, 5);
export const emailLinkLimiter = limiter(60, 5); // forgot password, resend confirmation
export const contactLimiter = limiter(60, 5);

/** Per logged-in user (not per IP): e.g. at most 20 booking requests per hour. */
export const perUserLimiter = (windowMinutes: number, limit: number) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' } });
    },
  });
