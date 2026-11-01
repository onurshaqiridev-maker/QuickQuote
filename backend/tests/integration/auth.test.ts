import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { createCategory, emailJobs, pool, resetDatabase, tokenFromUrl } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());
beforeEach(() => resetDatabase());

const customer = { fullName: 'Sara Miller', email: 'Sara@Example.com', password: 'MySecret123' };

function sessionCookie(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((value) => value.startsWith('qq_session='));
  if (!cookie) throw new Error('No session cookie');
  expect(cookie).toContain('HttpOnly');
  return cookie.split(';')[0];
}

describe('customer registration', () => {
  it('creates the account, logs in, and QUEUES (does not send) the welcome email', async () => {
    const response = await request(app).post('/api/auth/register/customer').send(customer);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({ email: 'sara@example.com', role: 'customer', emailVerified: false });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    sessionCookie(response);

    const jobs = await emailJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ template: 'customer_welcome', to_email: 'sara@example.com', status: 'pending', attempts: 0 });
  });

  it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
    await request(app).post('/api/auth/register/customer').send(customer);
    const response = await request(app)
      .post('/api/auth/register/customer')
      .send({ ...customer, email: 'sara@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns every validation problem with 400', async () => {
    const response = await request(app).post('/api/auth/register/customer').send({ fullName: 'S', email: 'nope', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'password']));
  });
});

describe('business registration', () => {
  it('creates user, business, unpublished profile and queues two emails', async () => {
    const categoryId = await createCategory();
    const response = await request(app).post('/api/auth/register/business').send({
      fullName: 'Lena Novak',
      email: 'lena@bellahair.example',
      password: 'SalonPass2026',
      businessName: 'Bella Hair Studio',
      city: 'Berlin',
      timezone: 'Europe/Berlin',
      categoryIds: [categoryId],
    });

    expect(response.status).toBe(201);
    expect(response.body.data.business).toMatchObject({
      status: 'pending_review',
      slug: 'bella-hair-studio',
      isPublished: false,
    });
    const templates = (await emailJobs()).map((job) => job.template).sort();
    expect(templates).toEqual(['admin_new_business', 'business_welcome']);
  });

  it('picks a free slug when the name is taken', async () => {
    const categoryId = await createCategory();
    const base = { password: 'SalonPass2026', businessName: 'Bella Hair Studio', city: 'Berlin', timezone: 'Europe/Berlin', categoryIds: [categoryId] };
    await request(app).post('/api/auth/register/business').send({ ...base, fullName: 'Owner One', email: 'one@example.com' });
    const second = await request(app).post('/api/auth/register/business').send({ ...base, fullName: 'Owner Two', email: 'two@example.com' });

    expect(second.body.data.business.slug).toBe('bella-hair-studio-2');
  });

  it('rejects unknown categories', async () => {
    const response = await request(app).post('/api/auth/register/business').send({
      fullName: 'Lena Novak',
      email: 'lena@example.com',
      password: 'SalonPass2026',
      businessName: 'Bella',
      city: 'Berlin',
      timezone: 'Europe/Berlin',
      categoryIds: ['00000000-0000-4000-8000-000000000000'],
    });
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('categoryIds');
  });
});

describe('login, session and logout', () => {
  it('logs in, returns the current user, and logs out', async () => {
    await request(app).post('/api/auth/register/customer').send(customer);

    const login = await request(app).post('/api/auth/login').send({ email: 'sara@example.com', password: 'MySecret123' });
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('sara@example.com');

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(204);
  });

  it('uses the same answer for unknown email and wrong password', async () => {
    await request(app).post('/api/auth/register/customer').send(customer);
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'sara@example.com', password: 'Wrong12345' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong12345' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('blocks suspended users immediately, even with a valid cookie', async () => {
    const register = await request(app).post('/api/auth/register/customer').send(customer);
    const cookie = sessionCookie(register);
    await pool.query("UPDATE users SET status = 'suspended' WHERE email = 'sara@example.com'");

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('requires a login for protected endpoints', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('email confirmation', () => {
  it('confirms the email with the token from the queued email, only once', async () => {
    await request(app).post('/api/auth/register/customer').send(customer);
    const [job] = await emailJobs();
    const token = tokenFromUrl(job.payload.verifyUrl);

    const first = await request(app).post('/api/auth/verify-email').send({ token });
    expect(first.status).toBe(200);
    expect(first.body.data.user.emailVerified).toBe(true);

    const second = await request(app).post('/api/auth/verify-email').send({ token });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('forgot and reset password', () => {
  it('answers the same for unknown emails and queues nothing', async () => {
    const response = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(response.status).toBe(200);
    expect(await emailJobs()).toHaveLength(0);
  });

  it('resets the password with the emailed token', async () => {
    await request(app).post('/api/auth/register/customer').send(customer);
    await request(app).post('/api/auth/forgot-password').send({ email: 'sara@example.com' });
    const resetJob = (await emailJobs()).find((job) => job.template === 'password_reset');
    expect(resetJob?.status).toBe('pending');

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: tokenFromUrl(resetJob!.payload.resetUrl), newPassword: 'BrandNew2026' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'sara@example.com', password: 'MySecret123' });
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'sara@example.com', password: 'BrandNew2026' });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });
});

describe('account settings', () => {
  it('updates the profile and changes the password', async () => {
    const register = await request(app).post('/api/auth/register/customer').send(customer);
    const cookie = sessionCookie(register);

    const profile = await request(app).put('/api/account/profile').set('Cookie', cookie).send({ fullName: 'Sara M.', phone: '+49 151 2345678' });
    expect(profile.status).toBe(200);
    expect(profile.body.data.user).toMatchObject({ fullName: 'Sara M.', phone: '+49 151 2345678' });

    const wrong = await request(app).post('/api/account/change-password').set('Cookie', cookie).send({ currentPassword: 'nope', newPassword: 'Another2026' });
    expect(wrong.status).toBe(400);

    const ok = await request(app).post('/api/account/change-password').set('Cookie', cookie).send({ currentPassword: 'MySecret123', newPassword: 'Another2026' });
    expect(ok.status).toBe(200);
  });
});
