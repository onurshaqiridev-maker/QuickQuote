/**
 * Reads and checks every environment variable ONCE, when the program starts.
 *
 * - In development, values come from the `backend/.env` file (copy `.env.example`).
 * - In production, the hosting platform provides them.
 *
 * If something required is missing or wrong, the program stops immediately with a
 * clear message instead of failing later in a confusing way.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const envFile = path.resolve(process.cwd(), '.env');
// Variables that are already set (e.g. by the hosting platform or the test runner) win over the file.
if (existsSync(envFile) && process.env.VITEST === undefined) {
  process.loadEnvFile(envFile);
}

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // PostgreSQL
    DATABASE_URL: z
      .string({ error: 'DATABASE_URL is required, e.g. postgres://user:password@localhost:5432/quickquote' })
      .min(1, 'DATABASE_URL is required, e.g. postgres://user:password@localhost:5432/quickquote'),
    DATABASE_SSL: booleanFromString,
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    // Login sessions
    JWT_SECRET: z
      .string({ error: 'JWT_SECRET is required (a long random string)' })
      .min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+d$/, 'JWT_EXPIRES_IN must be a number of days, e.g. "7d"')
      .default('7d'),

    // Public addresses (used for CORS and for links inside emails).
    // On Render they default to the service's own address (RENDER_EXTERNAL_URL), see loadEnv() below.
    FRONTEND_URL: z.url().default('http://localhost:5173'),
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),

    // Production: the built website (frontend/dist). When set, the API server also serves the website,
    // so both share one address (needed for the login cookie). Leave empty in development (Vite serves it).
    FRONTEND_DIST_DIR: z.string().min(1).optional(),

    // Email
    EMAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().min(3).default('Quotiva <onboarding@resend.dev>'),
    ADMIN_NOTIFICATION_EMAIL: z.email().default('admin@example.com'),
    EMAIL_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(5000),
    EMAIL_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
    // 5 attempts = 1 first try + 4 retries. At least 4 attempts (= at least 3 retries) are required.
    EMAIL_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .min(4, 'EMAIL_MAX_ATTEMPTS must be at least 4 (1 try + at least 3 retries)')
      .max(20)
      .default(5),
    EMAIL_SEND_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
    EMAIL_LOCK_TIMEOUT_MINUTES: z.coerce.number().int().min(1).default(10),

    // Paid plans. false = FREE LAUNCH: businesses can publish without a subscription
    // (the Starter limits apply). Set to true once payments are introduced.
    SUBSCRIPTIONS_REQUIRED: booleanFromString,

    // Uploaded images (logos, photos). Local folder for now; cloud storage later.
    UPLOAD_DIR: z.string().min(1).default('./uploads'),

    // Health check
    HEALTH_DB_TIMEOUT_MS: z.coerce.number().int().min(100).default(2000),

    // Only used by `npm run seed`
    SEED_ADMIN_EMAIL: z.email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((env, ctx) => {
    // Links in emails must never point to "localhost" on the real website.
    if (env.NODE_ENV === 'production' && /\/\/(localhost|127\.0\.0\.1)[:/]?/.test(env.FRONTEND_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRONTEND_URL'],
        message: 'FRONTEND_URL must be the public website address in production (e.g. https://quickquote.onrender.com)',
      });
    }
    if (env.EMAIL_DRIVER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when EMAIL_DRIVER=resend',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Treat empty strings ("KEY=") as "not set", so defaults apply.
  const raw: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== ''),
  );
  // Render tells every service its public address. With the website and API on one service, both use it.
  if (raw.RENDER_EXTERNAL_URL) {
    raw.FRONTEND_URL ??= raw.RENDER_EXTERNAL_URL;
    raw.API_PUBLIC_URL ??= raw.RENDER_EXTERNAL_URL;
  }
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}\n(See backend/.env.example)`);
  }
  return result.data;
}

export const env = loadEnv();

/** Number of days a login session lasts, from JWT_EXPIRES_IN (e.g. "7d" -> 7). */
export const sessionDays = Number.parseInt(env.JWT_EXPIRES_IN, 10);
