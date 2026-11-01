/** Builds businesses through the real API, for tests. */
import type { Express } from 'express';
import request from 'supertest';
import { hashPassword } from '../../src/services/password.service';
import { pool } from './db';

export function cookieOf(response: request.Response): string {
  return (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
}

export async function categoryIdBySlug(slug: string): Promise<string> {
  return (await pool.query<{ id: string }>('SELECT id FROM categories WHERE slug = $1', [slug])).rows[0].id;
}

export interface BusinessSpec {
  email: string;
  name: string;
  city: string;
  category?: string;
  description?: string;
  services?: { name: string; priceType?: string; priceCents?: number | null; durationMinutes?: number | null; isBookable?: boolean }[];
  approve?: boolean;
  publish?: boolean;
}

/** Registers a business, completes its profile and (by default) publishes and approves it. */
export async function createBusiness(app: Express, spec: BusinessSpec): Promise<{ id: string; slug: string; cookie: string }> {
  const registered = await request(app).post('/api/auth/register/business').send({
    fullName: 'Owner of ' + spec.name,
    email: spec.email,
    password: 'SalonPass2026',
    businessName: spec.name,
    city: spec.city,
    timezone: 'Europe/Berlin',
    categoryIds: [await categoryIdBySlug(spec.category ?? 'beauty-wellness')],
  });
  const cookie = cookieOf(registered);
  const { id, slug } = registered.body.data.business as { id: string; slug: string };

  await pool.query('UPDATE users SET email_verified_at = now() WHERE email = $1', [spec.email]);
  await request(app).put('/api/business/profile').set('Cookie', cookie)
    .send({ displayName: spec.name, description: spec.description ?? `${spec.name} description.`, city: spec.city });
  for (const service of spec.services ?? [{ name: 'Standard service', priceCents: 3000, durationMinutes: 30 }]) {
    await request(app).post('/api/business/services').set('Cookie', cookie)
      .send({ priceType: 'fixed', isBookable: true, ...service });
  }
  await request(app).put('/api/business/working-hours').set('Cookie', cookie)
    .send({ ranges: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] });
  if (spec.publish !== false) {
    const published = await request(app).post('/api/business/profile/publish').set('Cookie', cookie);
    if (published.status !== 200) throw new Error(`Publish failed: ${JSON.stringify(published.body)}`);
  }
  if (spec.approve !== false) await pool.query("UPDATE businesses SET status = 'approved' WHERE id = $1", [id]);
  return { id, slug, cookie };
}

/** Creates an admin account and returns its session cookie. */
export async function adminCookie(app: Express): Promise<string> {
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
     VALUES ('admin@example.com', $1, 'Admin', 'admin', now()) ON CONFLICT (email) DO NOTHING`,
    [await hashPassword('AdminPass123')],
  );
  return cookieOf(await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'AdminPass123' }));
}
