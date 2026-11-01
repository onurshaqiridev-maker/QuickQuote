import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { seedBaseData } from '../../src/services/seed.service';
import { createBusiness } from '../helpers/business';
import { pool, resetDatabase } from '../helpers/db';

const app = createApp();
let bella: { id: string; slug: string; cookie: string };

afterAll(() => closePool());
beforeAll(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
  bella = await createBusiness(app, {
    email: 'bella@example.com', name: 'Bella Hair Studio', city: 'Berlin', category: 'beauty-wellness',
    description: 'Modern cuts and colouring. '.repeat(10),
    services: [
      { name: "Women's haircut", priceCents: 4500, durationMinutes: 60 },
      { name: 'Balayage', priceType: 'starting_from', priceCents: 8950, durationMinutes: 150 },
      { name: 'Bridal hair', priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
    ],
  });
  await createBusiness(app, { email: 'fix@example.com', name: 'Quick Fix Plumbing', city: 'munich', category: 'home-services',
    services: [{ name: 'Leak repair', priceCents: 6000, durationMinutes: 60 }] });
  await createBusiness(app, { email: 'clean@example.com', name: 'Sparkle Cleaning 100%', city: 'Berlin', category: 'cleaning' });
  // Not visible: not approved / not published / owner suspended
  await createBusiness(app, { email: 'pending@example.com', name: 'Pending Hair', city: 'Berlin', approve: false });
  await createBusiness(app, { email: 'draft@example.com', name: 'Draft Hair', city: 'Berlin', publish: false });
  await createBusiness(app, { email: 'banned@example.com', name: 'Banned Hair', city: 'Berlin' });
  await pool.query("UPDATE users SET status = 'suspended' WHERE email = 'banned@example.com'");
  // An archived service must not show up publicly
  const archived = await request(app).post('/api/business/services').set('Cookie', bella.cookie).send({ name: 'Old perm', priceType: 'fixed', priceCents: 100, durationMinutes: 30, isBookable: true });
  await request(app).delete(`/api/business/services/${archived.body.data.id}`).set('Cookie', bella.cookie);
});

const names = (response: request.Response) => response.body.data.map((b: { displayName: string }) => b.displayName).sort();

describe('GET /api/businesses', () => {
  it('lists only visible businesses', async () => {
    const response = await request(app).get('/api/businesses');
    expect(response.status).toBe(200);
    expect(names(response)).toEqual(['Bella Hair Studio', 'Quick Fix Plumbing', 'Sparkle Cleaning 100%']);
    expect(response.body.meta).toMatchObject({ total: 3, page: 1, pageSize: 12 });
  });

  it('searches business names, service names and categories', async () => {
    expect(names(await request(app).get('/api/businesses?search=bella'))).toEqual(['Bella Hair Studio']);
    expect(names(await request(app).get('/api/businesses?search=leak'))).toEqual(['Quick Fix Plumbing']);
    expect(names(await request(app).get('/api/businesses?search=cleaning'))).toEqual(['Sparkle Cleaning 100%']);
  });

  it('treats % and _ in the search as normal characters', async () => {
    expect(names(await request(app).get('/api/businesses?search=100%25'))).toEqual(['Sparkle Cleaning 100%']);
    expect((await request(app).get('/api/businesses?search=%25')).body.meta.total).toBe(1);
  });

  it('filters by category and by city (case-insensitive, prefix)', async () => {
    expect(names(await request(app).get('/api/businesses?category=home-services'))).toEqual(['Quick Fix Plumbing']);
    expect(names(await request(app).get('/api/businesses?city=MUNICH'))).toEqual(['Quick Fix Plumbing']);
    expect(names(await request(app).get('/api/businesses?city=berl'))).toEqual(['Bella Hair Studio', 'Sparkle Cleaning 100%']);
  });

  it('returns cards with a short description and the starting price', async () => {
    const card = (await request(app).get('/api/businesses?search=bella')).body.data[0];
    expect(card.shortDescription.length).toBeLessThanOrEqual(160);
    expect(card.startingPriceCents).toBe(4500);
    expect(card.categories).toEqual([{ slug: 'beauty-wellness', name: 'Beauty & Wellness', icon: 'scissors' }]);
    expect(card.isFeatured).toBe(false);
  });

  it('paginates', async () => {
    const first = await request(app).get('/api/businesses?pageSize=2&page=1');
    const second = await request(app).get('/api/businesses?pageSize=2&page=2');
    expect(first.body.data).toHaveLength(2);
    expect(second.body.data).toHaveLength(1);
  });
});

describe('GET /api/businesses/:slug', () => {
  it('returns the public profile with active services and working hours', async () => {
    const response = await request(app).get(`/api/businesses/${bella.slug}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ displayName: 'Bella Hair Studio', timezone: 'Europe/Berlin' });
    expect(response.body.data.services.map((s: { name: string }) => s.name)).toEqual(["Women's haircut", 'Balayage', 'Bridal hair']);
    expect(response.body.data.workingHours).toEqual([{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
    expect(response.body.data.contact).toBeDefined();
  });

  it('answers 404 for businesses that are not visible', async () => {
    for (const slug of ['pending-hair', 'draft-hair', 'banned-hair', 'does-not-exist']) {
      expect((await request(app).get(`/api/businesses/${slug}`)).status).toBe(404);
    }
  });
});

describe('GET /api/cities', () => {
  it('lists cities of visible businesses once each', async () => {
    const response = await request(app).get('/api/cities');
    expect(response.body.data).toEqual([
      { name: 'Berlin', businessCount: 2 },
      { name: 'munich', businessCount: 1 },
    ]);
  });
});
