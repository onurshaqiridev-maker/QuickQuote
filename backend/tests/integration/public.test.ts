import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { seedBaseData } from '../../src/services/seed.service';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());
beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
});

describe('public catalog endpoints', () => {
  it('GET /api/plans returns the active plans, cheapest first', async () => {
    const response = await request(app).get('/api/plans');

    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { code: string }) => plan.code)).toEqual(['starter', 'professional', 'premium']);
    expect(response.body.data[0]).toMatchObject({ priceCents: 1900, currency: 'EUR', maxServices: 10, maxPhotos: 5, isFeatured: false });
    expect(response.body.data[2]).toMatchObject({ maxServices: null, isFeatured: true });
  });

  it('GET /api/categories returns the 12 seeded categories in order', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(12);
    expect(response.body.data[0]).toMatchObject({ name: 'Beauty & Wellness', slug: 'beauty-wellness' });
  });
});
