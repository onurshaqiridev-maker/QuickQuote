import { DateTime } from 'luxon';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { categories } from '../../seeds/data/categories';
import { plans } from '../../seeds/data/plans';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { runReservationMaintenance } from '../../src/services/maintenance.service';
import { seedBaseData } from '../../src/services/seed.service';
import { cookieOf, createBusiness } from '../helpers/business';
import { emailJobs, pool, resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());

/** The Monday at least 3 days from now (so the 2-hour notice never gets in the way). */
function nextMonday(): string {
  let day = DateTime.now().setZone('Europe/Berlin').plus({ days: 3 }).startOf('day');
  while (day.weekday !== 1) day = day.plus({ days: 1 });
  return day.toISODate() as string;
}

/** "09:30" on `date` in Berlin, as an exact moment. */
function at(date: string, time: string): string {
  return DateTime.fromISO(`${date}T${time}`, { zone: 'Europe/Berlin' }).toUTC().toISO() as string;
}

let business: { id: string; slug: string; cookie: string };
let haircutId: string;
let quoteOnlyId: string;
const monday = nextMonday();

async function customer(email: string, verified = true): Promise<string> {
  const response = await request(app).post('/api/auth/register/customer').send({ fullName: 'Sara Miller', email, password: 'MySecret123' });
  if (verified) await pool.query('UPDATE users SET email_verified_at = now() WHERE email = $1', [email]);
  return cookieOf(response);
}

function book(cookie: string, time = '09:00', serviceId = haircutId) {
  return request(app).post('/api/customer/reservations').set('Cookie', cookie)
    .send({ businessId: business.id, serviceId, startsAt: at(monday, time), notes: 'First visit', phone: '+49 151 2345678' });
}

beforeEach(async () => {
  await resetDatabase();
  await seedBaseData({ categories, plans });
  business = await createBusiness(app, {
    email: 'bella@example.com', name: 'Bella Hair Studio', city: 'Berlin',
    services: [
      { name: "Women's haircut", priceCents: 4500, durationMinutes: 60 },
      { name: 'Bridal hair', priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
    ],
  }); // Monday 09:00-17:00, 30-minute slots
  const services = (await request(app).get('/api/business/services').set('Cookie', business.cookie)).body.data;
  haircutId = services.find((s: { name: string }) => s.name === "Women's haircut").id;
  quoteOnlyId = services.find((s: { name: string }) => s.name === 'Bridal hair').id;
});

describe('availability', () => {
  it('lists free slots in the business time zone', async () => {
    const response = await request(app).get(`/api/businesses/${business.slug}/availability?serviceId=${haircutId}&date=${monday}`);
    expect(response.status).toBe(200);
    expect(response.body.data.timezone).toBe('Europe/Berlin');
    expect(response.body.data.slots[0]).toEqual({ startsAt: at(monday, '09:00'), localTime: '09:00' });
    expect(response.body.data.slots.at(-1).localTime).toBe('16:00'); // 16:00 + 60 min = closing time
  });

  it('refuses services that cannot be booked online', async () => {
    expect((await request(app).get(`/api/businesses/${business.slug}/availability?serviceId=${quoteOnlyId}&date=${monday}`)).status).toBe(404);
  });
});

describe('booking', () => {
  it('creates a pending reservation, queues two emails and blocks the slot', async () => {
    const sara = await customer('sara@example.com');
    const response = await book(sara);
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: 'pending', canCancel: true, service: { name: "Women's haircut", priceCents: 4500, durationMinutes: 60 } });

    const templates = (await emailJobs()).map((job) => job.template);
    expect(templates).toEqual(expect.arrayContaining(['reservation_new_business', 'reservation_received_customer']));
    const toBusiness = (await emailJobs()).find((job) => job.template === 'reservation_new_business');
    expect(toBusiness?.payload.when).toMatch(/^Monday, \d{1,2} \w+ \d{4} at 09:00$/);

    const slots = (await request(app).get(`/api/businesses/${business.slug}/availability?serviceId=${haircutId}&date=${monday}`)).body.data.slots;
    expect(slots.map((s: { localTime: string }) => s.localTime)).not.toContain('09:00');
    expect(slots.map((s: { localTime: string }) => s.localTime)).not.toContain('09:30'); // would overlap 09:00-10:00
    expect(slots.map((s: { localTime: string }) => s.localTime)).toContain('10:00');
  });

  it('never double-books, even when two customers click at the same moment', async () => {
    const [a, b] = [await customer('a@example.com'), await customer('b@example.com')];
    const results = await Promise.all([book(a, '11:00'), book(b, '11:00')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)?.body.error.code).toBe('SLOT_UNAVAILABLE');
    const count = await pool.query("SELECT count(*) FROM reservations WHERE status = 'pending'");
    expect(count.rows[0].count).toBe('1');
  });

  it('refuses times that are not a free slot', async () => {
    const sara = await customer('sara@example.com');
    expect((await book(sara, '09:10')).body.error.code).toBe('SLOT_UNAVAILABLE'); // not on the 30-minute grid
    expect((await book(sara, '16:30')).body.error.code).toBe('SLOT_UNAVAILABLE'); // would end after closing
  });

  it('requires a customer with a confirmed email', async () => {
    const unverified = await customer('new@example.com', false);
    const notVerified = await book(unverified);
    expect(notVerified.status).toBe(403);
    expect(notVerified.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect((await book(business.cookie)).status).toBe(403); // a business owner cannot book
  });
});

describe('the business decides', () => {
  it('confirms (email to the customer) and cannot confirm twice', async () => {
    const reservation = (await book(await customer('sara@example.com'))).body.data;
    const confirmed = await request(app).post(`/api/business/reservations/${reservation.id}/confirm`).set('Cookie', business.cookie);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data).toMatchObject({ status: 'confirmed', customer: { name: 'Sara Miller', phone: '+49 151 2345678', previousVisits: 0 } });
    expect((await emailJobs()).some((job) => job.template === 'reservation_confirmed_customer')).toBe(true);

    const again = await request(app).post(`/api/business/reservations/${reservation.id}/confirm`).set('Cookie', business.cookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects with a message, freeing the slot', async () => {
    const reservation = (await book(await customer('sara@example.com'))).body.data;
    const rejected = await request(app).post(`/api/business/reservations/${reservation.id}/reject`).set('Cookie', business.cookie).send({ message: 'Fully booked, sorry!' });
    expect(rejected.body.data).toMatchObject({ status: 'rejected', businessMessage: 'Fully booked, sorry!' });
    const email = (await emailJobs()).find((job) => job.template === 'reservation_rejected_customer');
    expect(email?.payload.message).toBe('Fully booked, sorry!');
    expect((await book(await customer('other@example.com'))).status).toBe(201);
  });

  it("cannot see or change another business's reservations", async () => {
    const reservation = (await book(await customer('sara@example.com'))).body.data;
    const other = await createBusiness(app, { email: 'other-owner@example.com', name: 'Other Salon', city: 'Berlin' });
    expect((await request(app).get(`/api/business/reservations/${reservation.id}`).set('Cookie', other.cookie)).status).toBe(404);
    expect((await request(app).post(`/api/business/reservations/${reservation.id}/confirm`).set('Cookie', other.cookie)).status).toBe(404);
  });

  it('completes only after the appointment started', async () => {
    const reservation = (await book(await customer('sara@example.com'))).body.data;
    await request(app).post(`/api/business/reservations/${reservation.id}/confirm`).set('Cookie', business.cookie);
    expect((await request(app).post(`/api/business/reservations/${reservation.id}/complete`).set('Cookie', business.cookie)).status).toBe(409);
    await pool.query("UPDATE reservations SET starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour' WHERE id = $1", [reservation.id]);
    const completed = await request(app).post(`/api/business/reservations/${reservation.id}/complete`).set('Cookie', business.cookie);
    expect(completed.body.data.status).toBe('completed');
  });

  it('lists pending reservations and shows them on the overview', async () => {
    await book(await customer('sara@example.com'));
    const pending = await request(app).get('/api/business/reservations?tab=pending').set('Cookie', business.cookie);
    expect(pending.body.meta.total).toBe(1);
    const overview = await request(app).get('/api/business/overview').set('Cookie', business.cookie);
    expect(overview.body.data.reservations.pendingCount).toBe(1);
  });
});

describe('the customer cancels', () => {
  it('can cancel before the deadline (business is emailed)', async () => {
    const sara = await customer('sara@example.com');
    const reservation = (await book(sara)).body.data;
    const cancelled = await request(app).post(`/api/customer/reservations/${reservation.id}/cancel`).set('Cookie', sara).send({ message: 'I am sick' });
    expect(cancelled.body.data).toMatchObject({ status: 'cancelled', cancelledBy: 'customer', canCancel: false });
    const email = (await emailJobs()).find((job) => job.template === 'reservation_cancelled_business');
    expect(email?.payload.message).toBe('I am sick');

    const tabs = await request(app).get('/api/customer/overview').set('Cookie', sara);
    expect(tabs.body.data.counts).toEqual({ upcoming: 0, past: 0, cancelled: 1 });
  });

  it('cannot cancel online after the deadline', async () => {
    const sara = await customer('sara@example.com');
    const reservation = (await book(sara)).body.data;
    // The appointment now starts in 3 hours; the deadline (24 hours before) has passed.
    await pool.query("UPDATE reservations SET starts_at = now() + interval '3 hours', ends_at = now() + interval '4 hours' WHERE id = $1", [reservation.id]);
    const late = await request(app).post(`/api/customer/reservations/${reservation.id}/cancel`).set('Cookie', sara).send({});
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('CANCELLATION_WINDOW_PASSED');
  });

  it("cannot see another customer's reservation", async () => {
    const reservation = (await book(await customer('sara@example.com'))).body.data;
    const jonas = await customer('jonas@example.com');
    expect((await request(app).get(`/api/customer/reservations/${reservation.id}`).set('Cookie', jonas)).status).toBe(404);
    expect((await request(app).post(`/api/customer/reservations/${reservation.id}/cancel`).set('Cookie', jonas).send({})).status).toBe(404);
  });
});

describe('hourly maintenance', () => {
  it('completes finished appointments and cancels unanswered requests', async () => {
    const sara = await customer('sara@example.com');
    const done = (await book(sara, '09:00')).body.data;
    const unanswered = (await book(sara, '13:00')).body.data;
    await request(app).post(`/api/business/reservations/${done.id}/confirm`).set('Cookie', business.cookie);
    // Move both into the past.
    await pool.query("UPDATE reservations SET starts_at = now() - interval '14 hours', ends_at = now() - interval '13 hours' WHERE id = $1", [done.id]);
    await pool.query("UPDATE reservations SET starts_at = now() - interval '1 hour', ends_at = now() WHERE id = $1", [unanswered.id]);

    expect(await runReservationMaintenance()).toEqual({ completed: 1, expired: 1 });
    const statuses = (await pool.query('SELECT id, status, cancelled_by FROM reservations')).rows;
    expect(statuses.find((r) => r.id === done.id)?.status).toBe('completed');
    expect(statuses.find((r) => r.id === unanswered.id)).toMatchObject({ status: 'cancelled', cancelled_by: 'system' });
    const email = (await emailJobs()).find((job) => job.template === 'reservation_cancelled_customer');
    expect(email?.payload.cancelledBy).toBe('system');
  });
});
