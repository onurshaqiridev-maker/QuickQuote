import { DateTime } from 'luxon';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { renderEmail } from '../../src/services/email/templates';
import { seedBaseData } from '../../src/services/seed.service';
import { cookieOf, createBusiness } from '../helpers/business';
import { emailJobs, pool, resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());

let business: { id: string; slug: string; cookie: string };
let bridalId: string;
const inTwoMonths = DateTime.now().setZone('Europe/Berlin').plus({ months: 2 }).toISODate() as string;

async function customer(email: string, verified = true): Promise<string> {
  const response = await request(app).post('/api/auth/register/customer').send({ fullName: 'Sara Miller', email, password: 'MySecret123' });
  if (verified) await pool.query('UPDATE users SET email_verified_at = now() WHERE email = $1', [email]);
  return cookieOf(response);
}

function sendRequest(cookie: string, extra: Record<string, unknown> = {}) {
  return request(app).post('/api/customer/quote-requests').set('Cookie', cookie).send({
    businessId: business.id,
    serviceId: bridalId,
    subject: 'Bridal hair for my wedding',
    description: 'Wedding in June, long hair, updo with flowers. Trial session wanted.',
    preferredDate: inTwoMonths,
    budgetCents: 25000,
    phone: '+49 151 2345678',
    ...extra,
  });
}

const businessPost = (path: string, body: Record<string, unknown> = {}) =>
  request(app).post(`/api/business/quote-requests/${path}`).set('Cookie', business.cookie).send(body);

beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
  business = await createBusiness(app, {
    email: 'bella@example.com', name: 'Bella Hair Studio', city: 'Berlin',
    services: [
      { name: "Women's haircut", priceCents: 4500, durationMinutes: 60 },
      { name: 'Bridal hair', priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
    ],
  });
  const services = (await request(app).get('/api/business/services').set('Cookie', business.cookie)).body.data;
  bridalId = services.find((s: { name: string }) => s.name === 'Bridal hair').id;
});

describe('sending a quote request', () => {
  it('creates a pending request and queues an email to the business and to the customer', async () => {
    const sara = await customer('sara@example.com');
    const response = await sendRequest(sara);
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'pending',
      subject: 'Bridal hair for my wedding',
      preferredDate: inTwoMonths,
      budgetCents: 25000,
      service: { id: bridalId, name: 'Bridal hair' },
      business: { slug: business.slug, displayName: 'Bella Hair Studio' },
      quotedPriceCents: null,
      canDecide: false,
    });

    const jobs = (await emailJobs()).filter((job) => job.template.startsWith('quote_'));
    expect(jobs.map((job) => [job.template, job.to_email])).toEqual([
      ['quote_new_business', 'bella@example.com'],
      ['quote_received_customer', 'sara@example.com'],
    ]);
    // The email to the business really renders, with the budget and description in it.
    const email = renderEmail('quote_new_business', jobs[0].payload);
    expect(email.text).toContain('€250.00');
    expect(email.text).toContain('updo with flowers');
  });

  it('accepts a general request without a service', async () => {
    const sara = await customer('sara@example.com');
    const response = await sendRequest(sara, { serviceId: '', preferredDate: '', budgetCents: null });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ service: null, preferredDate: null, budgetCents: null });
  });

  it('checks the fields', async () => {
    const sara = await customer('sara@example.com');
    const response = await sendRequest(sara, { subject: 'Hi', description: 'short', budgetCents: -5 });
    expect(response.status).toBe(400);
    expect(response.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['budgetCents', 'description', 'subject']);

    const past = await sendRequest(sara, { preferredDate: '2020-01-01' });
    expect(past.status).toBe(400);
    expect(past.body.error.details[0]).toMatchObject({ field: 'preferredDate', message: 'The preferred date cannot be in the past.' });
  });

  it('needs a confirmed email, and only works for visible businesses', async () => {
    const unverified = await customer('new@example.com', false);
    expect((await sendRequest(unverified)).status).toBe(403);

    const sara = await customer('sara@example.com');
    await pool.query("UPDATE businesses SET status = 'suspended' WHERE id = $1", [business.id]);
    expect((await sendRequest(sara)).status).toBe(404);
  });

  it('refuses archived services', async () => {
    const sara = await customer('sara@example.com');
    await request(app).delete(`/api/business/services/${bridalId}`).set('Cookie', business.cookie);
    const response = await sendRequest(sara);
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('serviceId');
  });

  it('is only for customers', async () => {
    expect((await sendRequest(business.cookie)).status).toBe(403);
  });
});

describe('the business answers', () => {
  it('starts, then sends a quote with a price; the customer is emailed each time', async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;

    const list = await request(app).get('/api/business/quote-requests?tab=new').set('Cookie', business.cookie);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].customer).toEqual({ name: 'Sara Miller', email: 'sara@example.com', phone: '+49 151 2345678' });

    expect((await businessPost(`${id}/start`)).body.data.status).toBe('processing');
    const answered = await businessPost(`${id}/respond`, { quotedPriceCents: 22000, message: 'Includes a trial session one week before.' });
    expect(answered.status).toBe(200);
    expect(answered.body.data).toMatchObject({ status: 'completed', quotedPriceCents: 22000, businessMessage: 'Includes a trial session one week before.' });
    expect(answered.body.data.respondedAt).not.toBeNull();

    const statusMails = (await emailJobs()).filter((job) => job.template === 'quote_status_customer');
    expect(statusMails.map((job) => job.payload.status)).toEqual(['processing', 'completed']);
    expect(renderEmail('quote_status_customer', statusMails[1].payload).text).toContain('€220.00');

    // The customer now sees the answer and can decide.
    const mine = await request(app).get(`/api/customer/quote-requests/${id}`).set('Cookie', sara);
    expect(mine.body.data).toMatchObject({ status: 'completed', quotedPriceCents: 22000, canDecide: true });
  });

  it('can answer without a price, but needs a message', async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;
    expect((await businessPost(`${id}/respond`, { message: '' })).status).toBe(400);
    const answered = await businessPost(`${id}/respond`, { message: 'The price depends on a visit. Can I come by on Monday?' });
    expect(answered.body.data).toMatchObject({ status: 'completed', quotedPriceCents: null });
  });

  it('declines with an optional message', async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;
    const declined = await businessPost(`${id}/reject`, { message: 'Fully booked in June, sorry.' });
    expect(declined.body.data).toMatchObject({ status: 'rejected', businessMessage: 'Fully booked in June, sorry.' });

    const mine = await request(app).get('/api/customer/quote-requests?tab=declined').set('Cookie', sara);
    expect(mine.body.data).toHaveLength(1);
  });

  it('follows the status rules', async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;
    await businessPost(`${id}/respond`, { message: 'Done.' });

    const again = await businessPost(`${id}/start`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect((await businessPost(`${id}/reject`)).status).toBe(409);
  });

  it("cannot see or change another business's requests", async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;
    const other = await createBusiness(app, { email: 'other@example.com', name: 'Other Salon', city: 'Berlin' });
    expect((await request(app).get(`/api/business/quote-requests/${id}`).set('Cookie', other.cookie)).status).toBe(404);
    expect((await request(app).post(`/api/business/quote-requests/${id}/start`).set('Cookie', other.cookie)).status).toBe(404);
  });
});

describe('the customer decides', () => {
  it('accepts a quote once, and the business is emailed', async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;
    await businessPost(`${id}/respond`, { quotedPriceCents: 22000, message: 'See you in June.' });

    const accepted = await request(app).post(`/api/customer/quote-requests/${id}/accept`).set('Cookie', sara);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data).toMatchObject({ customerDecision: 'accepted', canDecide: false });

    const job = (await emailJobs()).find((j) => j.template === 'quote_decision_business');
    expect(job?.to_email).toBe('bella@example.com');
    expect(renderEmail('quote_decision_business', job!.payload).subject).toBe('Quote accepted: Bridal hair for my wedding');

    const twice = await request(app).post(`/api/customer/quote-requests/${id}/decline`).set('Cookie', sara);
    expect(twice.status).toBe(409);
    expect(twice.body.error.message).toBe('You already accepted this quote.');

    const businessView = await request(app).get(`/api/business/quote-requests/${id}`).set('Cookie', business.cookie);
    expect(businessView.body.data.customerDecision).toBe('accepted');
  });

  it('cannot decide before the business answered, or on someone else\'s request', async () => {
    const sara = await customer('sara@example.com');
    const id = (await sendRequest(sara)).body.data.id;
    expect((await request(app).post(`/api/customer/quote-requests/${id}/accept`).set('Cookie', sara)).status).toBe(409);

    await businessPost(`${id}/respond`, { message: 'Done.' });
    const jonas = await customer('jonas@example.com');
    expect((await request(app).post(`/api/customer/quote-requests/${id}/decline`).set('Cookie', jonas)).status).toBe(404);
    expect((await request(app).get(`/api/customer/quote-requests/${id}`).set('Cookie', jonas)).status).toBe(404);
  });
});

describe('overviews', () => {
  it('show quote counts to the customer and the business', async () => {
    const sara = await customer('sara@example.com');
    const first = (await sendRequest(sara)).body.data.id;
    await sendRequest(sara, { subject: 'Hair colour advice' });
    await businessPost(`${first}/respond`, { message: 'Done.' });

    const customerOverview = await request(app).get('/api/customer/overview').set('Cookie', sara);
    expect(customerOverview.body.data.quotes.counts).toEqual({ open: 1, answered: 1, declined: 0 });
    expect(customerOverview.body.data.quotes.recent).toHaveLength(2);
    expect(customerOverview.body.data.counts).toEqual({ upcoming: 0, past: 0, cancelled: 0 }); // reservations stay where they were

    const businessOverview = await request(app).get('/api/business/overview').set('Cookie', business.cookie);
    expect(businessOverview.body.data.quotes).toEqual({ new: 1, in_progress: 0, answered: 1, declined: 0 });
  });
});
