import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { seedBaseData } from '../../src/services/seed.service';
import { adminCookie, cookieOf, createBusiness } from '../helpers/business';
import { emailJobs, pool, resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());
beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
});

describe('admin business review', () => {
  it('lists businesses waiting for review, with search', async () => {
    await createBusiness(app, { email: 'a@example.com', name: 'Bella Hair Studio', city: 'Berlin', approve: false });
    await createBusiness(app, { email: 'b@example.com', name: 'Quick Fix Plumbing', city: 'Munich', approve: false });
    const admin = await adminCookie(app);

    const all = await request(app).get('/api/admin/businesses?status=pending_review').set('Cookie', admin);
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(2);
    expect(all.body.data[0]).toMatchObject({ status: 'pending_review', isPublished: true, activeServices: 1 });
    expect(all.body.data[0].owner.emailVerified).toBe(true);

    const searched = await request(app).get('/api/admin/businesses?search=plumb').set('Cookie', admin);
    expect(searched.body.data.map((b: { displayName: string }) => b.displayName)).toEqual(['Quick Fix Plumbing']);
  });

  it('approves a business, emails the owner and makes it visible', async () => {
    const business = await createBusiness(app, { email: 'a@example.com', name: 'Bella Hair Studio', city: 'Berlin', approve: false });
    const admin = await adminCookie(app);
    expect((await request(app).get(`/api/businesses/${business.slug}`)).status).toBe(404);

    const approved = await request(app).post(`/api/admin/businesses/${business.id}/approve`).set('Cookie', admin);
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({ status: 'approved', statusReason: null });
    expect(approved.body.data.approvedAt).not.toBeNull();

    const email = (await emailJobs()).find((job) => job.template === 'business_approved');
    expect(email).toMatchObject({ to_email: 'a@example.com', status: 'pending' });
    expect((await request(app).get(`/api/businesses/${business.slug}`)).status).toBe(200);

    const activity = await pool.query("SELECT action FROM activity_logs WHERE action = 'business.approved'");
    expect(activity.rowCount).toBe(1);
  });

  it('suspends with a reason (hidden + email), refuses impossible changes', async () => {
    const business = await createBusiness(app, { email: 'a@example.com', name: 'Bella Hair Studio', city: 'Berlin' });
    const admin = await adminCookie(app);

    const noReason = await request(app).post(`/api/admin/businesses/${business.id}/suspend`).set('Cookie', admin).send({});
    expect(noReason.status).toBe(400);

    const suspended = await request(app).post(`/api/admin/businesses/${business.id}/suspend`).set('Cookie', admin).send({ reason: 'Complaints from customers' });
    expect(suspended.body.data).toMatchObject({ status: 'suspended', statusReason: 'Complaints from customers' });
    expect((await request(app).get(`/api/businesses/${business.slug}`)).status).toBe(404);
    const email = (await emailJobs()).find((job) => job.template === 'business_suspended');
    expect(email?.payload).toMatchObject({ status: 'suspended', reason: 'Complaints from customers' });

    const reactivateSuspended = await request(app).post(`/api/admin/businesses/${business.id}/reactivate`).set('Cookie', admin);
    expect(reactivateSuspended.status).toBe(409);
    expect(reactivateSuspended.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    await request(app).post(`/api/admin/businesses/${business.id}/deactivate`).set('Cookie', admin).send({ reason: 'Fake business' });
    const reactivated = await request(app).post(`/api/admin/businesses/${business.id}/reactivate`).set('Cookie', admin);
    expect(reactivated.body.data.status).toBe('approved');
  });

  it('shows details with owner, profile and checklist', async () => {
    const business = await createBusiness(app, { email: 'a@example.com', name: 'Bella Hair Studio', city: 'Berlin', approve: false });
    const admin = await adminCookie(app);
    const detail = await request(app).get(`/api/admin/businesses/${business.id}`).set('Cookie', admin);
    expect(detail.body.data.owner.email).toBe('a@example.com');
    expect(detail.body.data.profile.displayName).toBe('Bella Hair Studio');
    expect(detail.body.data.checklist.find((item: { key: string }) => item.key === 'approved').done).toBe(false);
    expect((await request(app).get('/api/admin/businesses/00000000-0000-4000-8000-000000000000').set('Cookie', admin)).status).toBe(404);
  });

  it('is for admins only', async () => {
    const business = await createBusiness(app, { email: 'a@example.com', name: 'Bella Hair Studio', city: 'Berlin', approve: false });
    const response = await request(app).post(`/api/admin/businesses/${business.id}/approve`).set('Cookie', business.cookie);
    expect(response.status).toBe(403);
    const customer = cookieOf(await request(app).post('/api/auth/register/customer').send({ fullName: 'Sara Miller', email: 's@example.com', password: 'MySecret123' }));
    expect((await request(app).get('/api/admin/businesses').set('Cookie', customer)).status).toBe(403);
  });
});
