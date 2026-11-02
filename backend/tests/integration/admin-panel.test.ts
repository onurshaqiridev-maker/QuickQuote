import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { seedBaseData } from '../../src/services/seed.service';
import { adminCookie, cookieOf, createBusiness } from '../helpers/business';
import { pool, resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());

let admin: string;
let business: { id: string; slug: string; cookie: string };
let sara: { id: string; cookie: string };

async function customer(email: string, fullName: string) {
  const response = await request(app).post('/api/auth/register/customer').send({ fullName, email, password: 'MySecret123' });
  await pool.query('UPDATE users SET email_verified_at = now() WHERE email = $1', [email]);
  return { id: response.body.data.user.id as string, cookie: cookieOf(response) };
}

/** Saves a reservation directly (the booking rules are tested elsewhere). */
async function addReservation(customerId: string, startsAt: string, status = 'pending') {
  const service = (await pool.query<{ id: string }>('SELECT id FROM services WHERE business_id = $1 LIMIT 1', [business.id])).rows[0];
  await pool.query(
    `INSERT INTO reservations (business_id, customer_id, service_id, service_name, price_type, price_cents, starts_at, ends_at, status)
     VALUES ($1, $2, $3, 'Standard service', 'fixed', 3000, $4::timestamptz, $4::timestamptz + interval '30 minutes', $5)`,
    [business.id, customerId, service.id, startsAt, status],
  );
}

const get = (path: string) => request(app).get(`/api/admin${path}`).set('Cookie', admin);
const post = (path: string, body: Record<string, unknown> = {}) => request(app).post(`/api/admin${path}`).set('Cookie', admin).send(body);

beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
  admin = await adminCookie(app);
  business = await createBusiness(app, { email: 'bella@example.com', name: 'Bella Hair Studio', city: 'Berlin' });
  sara = await customer('sara@example.com', 'Sara Miller');
});

describe('admin overview', () => {
  it('counts users, businesses, reservations and quotes', async () => {
    await createBusiness(app, { email: 'new@example.com', name: 'New Salon', city: 'Berlin', approve: false });
    await addReservation(sara.id, '2030-01-07T09:00:00Z');
    await request(app).post('/api/customer/quote-requests').set('Cookie', sara.cookie)
      .send({ businessId: business.id, subject: 'Hair colour', description: 'Natural blonde highlights, please.' });

    const response = await get('/stats');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      users: { customers: 1, businessOwners: 2, suspended: 0 },
      businesses: { pending_review: 1, approved: 1, suspended: 0, deactivated: 0, visible: 1 },
      reservations: { createdThisWeek: 1, pending: 1 },
      quotes: { createdThisWeek: 1, open: 1 },
    });
  });

  it('shows the activity feed with who did what, newest first', async () => {
    await request(app).post('/api/customer/quote-requests').set('Cookie', sara.cookie)
      .send({ businessId: business.id, subject: 'Hair colour', description: 'Natural blonde highlights, please.' });
    const response = await get('/activity?pageSize=5');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      action: 'quote.created',
      entityType: 'quote_request',
      entityLabel: 'Hair colour (Bella Hair Studio)',
      actor: { fullName: 'Sara Miller', role: 'customer' },
    });
    expect(response.body.meta.total).toBeGreaterThan(1);
  });

  it('is for admins only', async () => {
    expect((await request(app).get('/api/admin/stats').set('Cookie', sara.cookie)).status).toBe(403);
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
  });
});

describe('managing users', () => {
  it('lists users with filters and shows details with counts', async () => {
    await customer('jonas@example.com', 'Jonas Weber');
    await addReservation(sara.id, '2030-01-07T09:00:00Z');

    const customers = await get('/users?role=customer');
    expect(customers.body.data.map((u: { fullName: string }) => u.fullName)).toEqual(['Jonas Weber', 'Sara Miller']);
    expect((await get('/users?search=bella')).body.data[0]).toMatchObject({ email: 'bella@example.com', role: 'business_owner' });

    const detail = await get(`/users/${sara.id}`);
    expect(detail.body.data).toMatchObject({ fullName: 'Sara Miller', counts: { reservations: 1, quoteRequests: 0 }, business: null });

    const ownerId = (await pool.query("SELECT id FROM users WHERE email = 'bella@example.com'")).rows[0].id;
    expect((await get(`/users/${ownerId}`)).body.data.business).toMatchObject({ displayName: 'Bella Hair Studio', status: 'approved' });
  });

  it('suspends a customer: logged out at once and cannot log in, until reactivated', async () => {
    const suspended = await post(`/users/${sara.id}/suspend`, { reason: 'Spam quote requests' });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data).toMatchObject({ status: 'suspended', statusReason: 'Spam quote requests' });

    expect((await request(app).get('/api/auth/me').set('Cookie', sara.cookie)).status).toBe(403);
    const login = await request(app).post('/api/auth/login').send({ email: 'sara@example.com', password: 'MySecret123' });
    expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED');

    expect((await post(`/users/${sara.id}/suspend`, { reason: 'Again' })).status).toBe(409);
    expect((await post(`/users/${sara.id}/reactivate`)).body.data.status).toBe('active');
    expect((await request(app).post('/api/auth/login').send({ email: 'sara@example.com', password: 'MySecret123' })).status).toBe(200);
  });

  it("hides a suspended owner's business from the website", async () => {
    const ownerId = (await pool.query("SELECT id FROM users WHERE email = 'bella@example.com'")).rows[0].id;
    await post(`/users/${ownerId}/suspend`, { reason: 'Fake business' });
    expect((await request(app).get(`/api/businesses/${business.slug}`)).status).toBe(404);
    expect((await get('/stats')).body.data.businesses.visible).toBe(0);
  });

  it('needs a reason, and never suspends administrators', async () => {
    expect((await post(`/users/${sara.id}/suspend`, {})).status).toBe(400);
    const adminId = (await pool.query("SELECT id FROM users WHERE role = 'admin'")).rows[0].id;
    expect((await post(`/users/${adminId}/suspend`, { reason: 'Testing' })).status).toBe(403);
  });
});

describe('all reservations and quote requests (read-only)', () => {
  it('filters reservations by status, text and date', async () => {
    const jonas = await customer('jonas@example.com', 'Jonas Weber');
    await addReservation(sara.id, '2030-01-07T09:00:00Z', 'confirmed');
    await addReservation(jonas.id, '2030-02-11T09:00:00Z', 'pending');

    const all = await get('/reservations');
    expect(all.body.data).toHaveLength(2);
    expect(all.body.data[0]).toMatchObject({ customer: { name: 'Jonas Weber' }, business: { displayName: 'Bella Hair Studio' } }); // latest first
    expect((await get('/reservations?status=confirmed')).body.data.map((r: { customer: { name: string } }) => r.customer.name)).toEqual(['Sara Miller']);
    expect((await get('/reservations?search=jonas')).body.meta.total).toBe(1);
    expect((await get('/reservations?from=2030-02-01&to=2030-02-11')).body.meta.total).toBe(1);
    expect((await get('/reservations?from=2030-02-12')).body.meta.total).toBe(0);
    expect((await get('/reservations?status=unknown')).status).toBe(400);
  });

  it('filters quote requests by status and text', async () => {
    const send = (subject: string) =>
      request(app).post('/api/customer/quote-requests').set('Cookie', sara.cookie)
        .send({ businessId: business.id, subject, description: 'Please send me a price for this.' });
    const first = (await send('Hair colour')).body.data.id;
    await send('Wedding hair');
    await request(app).post(`/api/business/quote-requests/${first}/reject`).set('Cookie', business.cookie).send({});

    expect((await get('/quote-requests')).body.meta.total).toBe(2);
    expect((await get('/quote-requests?status=rejected')).body.data[0]).toMatchObject({ subject: 'Hair colour', customer: { name: 'Sara Miller' } });
    expect((await get('/quote-requests?search=wedding')).body.data.map((q: { subject: string }) => q.subject)).toEqual(['Wedding hair']);
  });
});

describe('managing categories', () => {
  it('lists all categories with how many businesses use them', async () => {
    const list = (await get('/categories')).body.data;
    expect(list).toHaveLength(categories.length);
    expect(list.find((c: { slug: string }) => c.slug === 'beauty-wellness').businessCount).toBe(1);
  });

  it('creates a category with an address name made from the name', async () => {
    const created = await post('/categories', { name: 'Pet Care & Grooming', icon: 'paw-print', sortOrder: 13 });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'pet-care-grooming', icon: 'paw-print', isActive: true, businessCount: 0 });
    expect((await request(app).get('/api/categories')).body.data.map((c: { slug: string }) => c.slug)).toContain('pet-care-grooming');

    const twice = await post('/categories', { name: 'Pet Care & Grooming' });
    expect(twice.status).toBe(400);
    expect(twice.body.error.details[0].field).toBe('name');
    expect((await post('/categories', { name: 'Toys', icon: 'rocket' })).status).toBe(400);
    expect((await post('/categories', { name: '&&&' })).body.error.details[0].field).toBe('slug');
  });

  it('switches a category off, so it is no longer offered', async () => {
    const pets = (await post('/categories', { name: 'Pets' })).body.data;
    const updated = await request(app).put(`/api/admin/categories/${pets.id}`).set('Cookie', admin)
      .send({ name: 'Pets', slug: 'pets', isActive: false, sortOrder: 20 });
    expect(updated.body.data).toMatchObject({ isActive: false, sortOrder: 20 });
    expect((await request(app).get('/api/categories')).body.data.map((c: { slug: string }) => c.slug)).not.toContain('pets');
  });

  it('deletes only unused categories', async () => {
    const pets = (await post('/categories', { name: 'Pets' })).body.data;
    expect((await request(app).delete(`/api/admin/categories/${pets.id}`).set('Cookie', admin)).status).toBe(204);

    const used = (await get('/categories')).body.data.find((c: { slug: string }) => c.slug === 'beauty-wellness');
    const refused = await request(app).delete(`/api/admin/categories/${used.id}`).set('Cookie', admin);
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('CATEGORY_IN_USE');
    expect((await get('/activity')).body.data.some((a: { action: string; metadata: { name?: string } }) => a.action === 'category.deleted' && a.metadata.name === 'Pets')).toBe(true);
  });
});
