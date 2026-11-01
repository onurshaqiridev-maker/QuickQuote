/**
 * Application logger (pino).
 * - development: colourful, readable lines
 * - production: one JSON object per line (easy for hosting platforms to search)
 * - test: silent
 * Passwords, tokens and cookies are removed from logs automatically.
 */
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: ['password', '*.password', 'token', '*.token', 'req.headers.cookie', 'headers.cookie'],
    censor: '[hidden]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        }
      : undefined,
});
