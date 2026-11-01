/**
 * When payments are switched on later (SUBSCRIPTIONS_REQUIRED=true),
 * publishing and visibility require an active subscription.
 */
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.SUBSCRIPTIONS_REQUIRED = 'true';
});

import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { seedBaseData } from '../../src/services/seed.service';
import { pool, resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());
beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
});

describe('paid mode (SUBSCRIPTIONS_REQUIRED=true)', () => {
  it('requires an active subscription to publish and to be visible', async () => {
    const [{ id: categoryId }] = (await pool.query<{ id: string }>('SELECT id FROM categories LIMIT 1')).rows;
    const registered = await request(app).post('/api/auth/register/business').send({
      fullName: 'Lena Novak', email: 'lena@bellahair.example', password: 'SalonPass2026',
      businessName: 'Bella Hair Studio', city: 'Berlin', timezone: 'Europe/Berlin', categoryIds: [categoryId],
    });
    const cookie = (registered.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const businessId: string = registered.body.data.business.id;

    await pool.query('UPDATE users SET email_verified_at = now()');
    await request(app).put('/api/business/profile').set('Cookie', cookie).send({ displayName: 'Bella Hair Studio', description: 'Cuts.', city: 'Berlin' });
    await request(app).post('/api/business/services').set('Cookie', cookie)
      .send({ name: 'Haircut', priceType: 'fixed', priceCents: 4500, durationMinutes: 60, isBookable: true });
    await request(app).put('/api/business/working-hours').set('Cookie', cookie).send({ ranges: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] });

    const blocked = await request(app).post('/api/business/profile/publish').set('Cookie', cookie);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.details.map((d: { field: string }) => d.field)).toEqual(['subscription']);
    expect((await request(app).get('/api/config')).body.data).toEqual({ subscriptionsRequired: true });

    await pool.query(
      `INSERT INTO subscriptions (business_id, plan_id, status, current_period_start, current_period_end)
       SELECT $1, id, 'active', now(), now() + interval '1 month' FROM subscription_plans WHERE code = 'starter'`,
      [businessId],
    );
    expect((await request(app).post('/api/business/profile/publish').set('Cookie', cookie)).status).toBe(200);
    await pool.query("UPDATE businesses SET status = 'approved' WHERE id = $1", [businessId]);
    const overview = await request(app).get('/api/business/overview').set('Cookie', cookie);
    expect(overview.body.data).toMatchObject({ isVisible: true, subscriptionsRequired: true });
    expect(overview.body.data.usage.planName).toBe('Starter');
  });
});
