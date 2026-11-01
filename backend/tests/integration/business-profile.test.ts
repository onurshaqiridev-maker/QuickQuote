import { existsSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { seedBaseData } from '../../src/services/seed.service';
import { pool, resetDatabase } from '../helpers/db';

const app = createApp();
const UPLOAD_DIR = '/tmp/quickquote-test-uploads';
// The smallest valid PNG image (1x1 pixel).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

afterAll(() => closePool());
beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans }); // Starter limits: 10 services, 5 photos
});

async function categoryIds(): Promise<string[]> {
  return (await pool.query<{ id: string }>('SELECT id FROM categories ORDER BY sort_order')).rows.map((r) => r.id);
}

/** Registers a business owner and returns their session cookie and business id. */
async function registerOwner(email = 'lena@bellahair.example') {
  const [first] = await categoryIds();
  const response = await request(app).post('/api/auth/register/business').send({
    fullName: 'Lena Novak',
    email,
    password: 'SalonPass2026',
    businessName: 'Bella Hair Studio',
    city: 'Berlin',
    timezone: 'Europe/Berlin',
    categoryIds: [first],
  });
  expect(response.status).toBe(201);
  const cookie = (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  return { cookie, businessId: response.body.data.business.id as string };
}

const haircut = { name: "Women's haircut", priceType: 'fixed', priceCents: 4500, durationMinutes: 60, isBookable: true };

describe('access', () => {
  it('only business owners can use /api/business', async () => {
    const customer = await request(app)
      .post('/api/auth/register/customer')
      .send({ fullName: 'Sara Miller', email: 'sara@example.com', password: 'MySecret123' });
    const cookie = (customer.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    expect((await request(app).get('/api/business/profile').set('Cookie', cookie)).status).toBe(403);
    expect((await request(app).get('/api/business/profile')).status).toBe(401);
  });
});

describe('profile and categories', () => {
  it('updates the profile, normalising the country code', async () => {
    const { cookie } = await registerOwner();
    const response = await request(app).put('/api/business/profile').set('Cookie', cookie).send({
      displayName: 'Bella Hair Studio',
      description: 'Modern cuts and colouring in the city centre.',
      contactEmail: 'Hello@BellaHair.example',
      websiteUrl: 'https://bellahair.example',
      addressLine: 'Hauptstrasse 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'de',
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ country: 'DE', contactEmail: 'hello@bellahair.example', city: 'Berlin' });
  });

  it('rejects an invalid website address', async () => {
    const { cookie } = await registerOwner();
    const response = await request(app).put('/api/business/profile').set('Cookie', cookie).send({ displayName: 'Bella', websiteUrl: 'bellahair' });
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('websiteUrl');
  });

  it('sets 1 to 3 categories', async () => {
    const { cookie } = await registerOwner();
    const ids = await categoryIds();
    expect((await request(app).put('/api/business/categories').set('Cookie', cookie).send({ categoryIds: [] })).status).toBe(400);
    const response = await request(app).put('/api/business/categories').set('Cookie', cookie).send({ categoryIds: ids.slice(0, 2) });
    expect(response.status).toBe(200);
    expect(response.body.data.categories).toHaveLength(2);
  });
});

describe('logo and photos', () => {
  it('uploads a logo, serves it, and deletes the old file when replaced', async () => {
    const { cookie } = await registerOwner();
    const first = await request(app).post('/api/business/profile/logo').set('Cookie', cookie).attach('file', PNG, 'logo.png');
    expect(first.status).toBe(200);
    const firstUrl: string = first.body.data.logoUrl;
    expect(firstUrl).toMatch(/^\/uploads\/businesses\/.+\.png$/);
    const firstFile = path.join(UPLOAD_DIR, firstUrl.replace('/uploads/', ''));
    expect(existsSync(firstFile)).toBe(true);

    const served = await request(app).get(firstUrl);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');

    const second = await request(app).post('/api/business/profile/logo').set('Cookie', cookie).attach('file', PNG, 'new.png');
    expect(second.body.data.logoUrl).not.toBe(firstUrl);
    expect(existsSync(firstFile)).toBe(false);
  });

  it('checks the real file type, not the file name', async () => {
    const { cookie } = await registerOwner();
    const response = await request(app)
      .post('/api/business/profile/logo')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('<script>alert(1)</script>'), 'evil.png');
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toMatch(/JPEG, PNG or WebP/);
  });

  it('enforces the plan photo limit, reorders and deletes photos', async () => {
    const { cookie } = await registerOwner();
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const upload = await request(app).post('/api/business/photos').set('Cookie', cookie).field('caption', `Photo ${i}`).attach('file', PNG, 'p.png');
      expect(upload.status).toBe(201);
      ids.push(upload.body.data.id);
    }
    const sixth = await request(app).post('/api/business/photos').set('Cookie', cookie).attach('file', PNG, 'p.png');
    expect(sixth.status).toBe(403);
    expect(sixth.body.error.code).toBe('PLAN_LIMIT_REACHED');

    const reordered = await request(app).put('/api/business/photos/order').set('Cookie', cookie).send({ photoIds: [...ids].reverse() });
    expect(reordered.body.data.map((p: { id: string }) => p.id)).toEqual([...ids].reverse());

    expect((await request(app).delete(`/api/business/photos/${ids[0]}`).set('Cookie', cookie)).status).toBe(204);
    const profile = await request(app).get('/api/business/profile').set('Cookie', cookie);
    expect(profile.body.data.photos).toHaveLength(4);
  });
});

describe('services (offerings)', () => {
  it('validates prices and durations', async () => {
    const { cookie } = await registerOwner();
    const noPrice = await request(app).post('/api/business/services').set('Cookie', cookie).send({ ...haircut, priceCents: null });
    expect(noPrice.status).toBe(400);
    expect(noPrice.body.error.details[0].field).toBe('priceCents');
    const noDuration = await request(app).post('/api/business/services').set('Cookie', cookie).send({ ...haircut, durationMinutes: null });
    expect(noDuration.body.error.details[0].field).toBe('durationMinutes');

    const onRequest = await request(app).post('/api/business/services').set('Cookie', cookie)
      .send({ name: 'Bridal hair', priceType: 'on_request', priceCents: 9999, isBookable: false });
    expect(onRequest.status).toBe(201);
    expect(onRequest.body.data).toMatchObject({ priceCents: null, isBookable: false, isActive: true });
  });

  it('enforces the plan service limit; archiving frees a place', async () => {
    const { cookie } = await registerOwner();
    let lastId = '';
    for (let i = 0; i < 10; i += 1) {
      const created = await request(app).post('/api/business/services').set('Cookie', cookie).send({ ...haircut, name: `Service ${i}` });
      expect(created.status).toBe(201);
      lastId = created.body.data.id;
    }
    const eleventh = await request(app).post('/api/business/services').set('Cookie', cookie).send(haircut);
    expect(eleventh.status).toBe(403);
    expect(eleventh.body.error.code).toBe('PLAN_LIMIT_REACHED');

    const archived = await request(app).delete(`/api/business/services/${lastId}`).set('Cookie', cookie);
    expect(archived.body.data.isActive).toBe(false);
    expect((await request(app).post('/api/business/services').set('Cookie', cookie).send(haircut)).status).toBe(201);

    // Restoring the archived one would make 11 active services.
    const restore = await request(app).put(`/api/business/services/${lastId}`).set('Cookie', cookie).send({ ...haircut, isActive: true });
    expect(restore.status).toBe(403);
  });

  it("a business cannot change another business's service", async () => {
    const a = await registerOwner('a@example.com');
    const b = await registerOwner('b@example.com');
    const created = await request(app).post('/api/business/services').set('Cookie', a.cookie).send(haircut);
    const attempt = await request(app).put(`/api/business/services/${created.body.data.id}`).set('Cookie', b.cookie).send({ ...haircut, priceCents: 1 });
    expect(attempt.status).toBe(404);
  });
});

describe('working hours, blocked times and settings', () => {
  it('rejects overlapping ranges and saves a valid week', async () => {
    const { cookie } = await registerOwner();
    const overlap = await request(app).put('/api/business/working-hours').set('Cookie', cookie).send({
      ranges: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
      ],
    });
    expect(overlap.status).toBe(400);
    expect(overlap.body.error.details[0].message).toContain('Monday');

    const week = await request(app).put('/api/business/working-hours').set('Cookie', cookie).send({
      ranges: [
        { dayOfWeek: 2, startTime: '13:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      ],
    });
    expect(week.status).toBe(200);
    expect(week.body.data).toEqual([
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 2, startTime: '13:00', endTime: '18:00' },
    ]);
  });

  it('adds, lists and deletes blocked times', async () => {
    const { cookie } = await registerOwner();
    const start = new Date(Date.now() + 7 * 86_400_000);
    const end = new Date(start.getTime() + 2 * 86_400_000);
    const created = await request(app).post('/api/business/blocked-times').set('Cookie', cookie)
      .send({ startsAt: start.toISOString(), endsAt: end.toISOString(), reason: 'Holiday' });
    expect(created.status).toBe(201);
    const past = await request(app).post('/api/business/blocked-times').set('Cookie', cookie)
      .send({ startsAt: '2020-01-01T09:00:00Z', endsAt: '2020-01-02T09:00:00Z' });
    expect(past.status).toBe(400);
    expect((await request(app).get('/api/business/blocked-times').set('Cookie', cookie)).body.data).toHaveLength(1);
    expect((await request(app).delete(`/api/business/blocked-times/${created.body.data.id}`).set('Cookie', cookie)).status).toBe(204);
  });

  it('updates booking settings with validation', async () => {
    const { cookie } = await registerOwner();
    const bad = await request(app).put('/api/business/settings').set('Cookie', cookie)
      .send({ timezone: 'Europe/Berlin', slotIntervalMinutes: 25, minNoticeHours: 2, maxAdvanceDays: 60, cancellationNoticeHours: 24 });
    expect(bad.status).toBe(400);
    const good = await request(app).put('/api/business/settings').set('Cookie', cookie)
      .send({ timezone: 'Europe/Tirane', slotIntervalMinutes: 15, minNoticeHours: 4, maxAdvanceDays: 90, cancellationNoticeHours: 12 });
    expect(good.body.data).toEqual({ timezone: 'Europe/Tirane', slotIntervalMinutes: 15, minNoticeHours: 4, maxAdvanceDays: 90, cancellationNoticeHours: 12 });
  });
});

describe('go-live checklist and publishing (free launch: no subscription needed)', () => {
  it('lists what is missing, publishes when ready, and is visible only after approval', async () => {
    const { cookie, businessId } = await registerOwner();

    const blocked = await request(app).post('/api/business/profile/publish').set('Cookie', cookie);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('GO_LIVE_REQUIREMENTS_NOT_MET');
    const missing = blocked.body.error.details.map((d: { field: string }) => d.field);
    expect(missing).toEqual(expect.arrayContaining(['email_verified', 'profile', 'services']));
    expect(missing).not.toContain('subscription');

    // Do everything an owner can do:
    await pool.query('UPDATE users SET email_verified_at = now() WHERE email = $1', ['lena@bellahair.example']);
    await request(app).put('/api/business/profile').set('Cookie', cookie).send({ displayName: 'Bella Hair Studio', description: 'Cuts and colour.', city: 'Berlin' });
    await request(app).post('/api/business/services').set('Cookie', cookie).send(haircut);
    await request(app).put('/api/business/working-hours').set('Cookie', cookie).send({ ranges: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] });

    const published = await request(app).post('/api/business/profile/publish').set('Cookie', cookie);
    expect(published.status).toBe(200);
    expect(published.body.data.isPublished).toBe(true);

    let overview = await request(app).get('/api/business/overview').set('Cookie', cookie);
    expect(overview.body.data).toMatchObject({ canPublish: true, isVisible: false, subscriptionsRequired: false }); // waiting for approval
    expect(overview.body.data.checklist.map((item: { key: string }) => item.key)).not.toContain('subscription');
    expect(overview.body.data.usage).toMatchObject({ planName: null, services: { used: 1, limit: 10 } }); // Starter limits

    await pool.query("UPDATE businesses SET status = 'approved' WHERE id = $1", [businessId]);
    overview = await request(app).get('/api/business/overview').set('Cookie', cookie);
    expect(overview.body.data.isVisible).toBe(true);
    expect(overview.body.data.checklist.every((item: { done: boolean }) => item.done)).toBe(true);

    const unpublished = await request(app).post('/api/business/profile/unpublish').set('Cookie', cookie);
    expect(unpublished.body.data.isPublished).toBe(false);
  });

  it('GET /api/config tells the website that listing is free', async () => {
    const response = await request(app).get('/api/config');
    expect(response.body.data).toEqual({ subscriptionsRequired: false });
  });
});
