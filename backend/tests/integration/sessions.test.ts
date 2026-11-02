import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import { cookieOf } from '../helpers/business';
import { emailJobs, resetDatabase, tokenFromUrl } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());
beforeEach(() => resetDatabase());

const sara = { fullName: 'Sara Miller', email: 'sara@example.com', password: 'MySecret123' };
/** Session times are whole seconds; wait so the next step happens in a later second. */
const nextSecond = () => new Promise((resolve) => setTimeout(resolve, 1100));
const me = (cookie: string) => request(app).get('/api/auth/me').set('Cookie', cookie);

describe('login sessions after a password change', () => {
  it('a password reset logs out every existing session', async () => {
    const laptop = cookieOf(await request(app).post('/api/auth/register/customer').send(sara));
    expect((await me(laptop)).status).toBe(200);
    await nextSecond();

    await request(app).post('/api/auth/forgot-password').send({ email: sara.email });
    const job = (await emailJobs()).find((j) => j.template === 'password_reset');
    await request(app).post('/api/auth/reset-password').send({ token: tokenFromUrl(job!.payload.resetUrl), newPassword: 'BrandNew2026' });

    const old = await me(laptop);
    expect(old.status).toBe(401);
    expect(old.body.error.message).toBe('Your password was changed. Please log in again.');
    const fresh = cookieOf(await request(app).post('/api/auth/login').send({ email: sara.email, password: 'BrandNew2026' }));
    expect((await me(fresh)).status).toBe(200);
  });

  it('changing the password logs out other devices but keeps this one', async () => {
    const phone = cookieOf(await request(app).post('/api/auth/register/customer').send(sara));
    const laptop = cookieOf(await request(app).post('/api/auth/login').send({ email: sara.email, password: sara.password }));
    await nextSecond();

    const changed = await request(app).post('/api/account/change-password').set('Cookie', laptop)
      .send({ currentPassword: sara.password, newPassword: 'Another2026' });
    expect(changed.status).toBe(200);
    const laptopNow = cookieOf(changed); // the response gives this device a fresh session

    expect((await me(laptopNow)).status).toBe(200);
    expect((await me(phone)).status).toBe(401);
    expect((await me(laptop)).status).toBe(401);
  });

  it('a wrong current password changes nothing', async () => {
    const cookie = cookieOf(await request(app).post('/api/auth/register/customer').send(sara));
    const wrong = await request(app).post('/api/account/change-password').set('Cookie', cookie)
      .send({ currentPassword: 'Guess12345', newPassword: 'Another2026' });
    expect(wrong.status).toBe(400);
    expect((await me(cookie)).status).toBe(200);
  });
});
