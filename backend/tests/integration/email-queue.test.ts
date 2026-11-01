import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';
import type { OutgoingEmail } from '../../src/models/dto/email.dto';
import { hashPassword } from '../../src/services/password.service';
import { enqueueEmail } from '../../src/services/email/email-queue.service';
import { processEmailBatch } from '../../src/services/email/email-worker.service';
import type { EmailSender } from '../../src/services/email/senders';
import { emailJobs, makePendingJobsDue, pool, resetDatabase } from '../helpers/db';

const app = createApp();
afterAll(() => closePool());
beforeEach(() => resetDatabase());

/** A fake "Resend" that records what it was asked to send. */
function recordingSender(): EmailSender & { sent: OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  return {
    name: 'test',
    sent,
    async send(email) {
      sent.push(email);
      return { providerMessageId: `msg_${sent.length}` };
    },
  };
}

/** A fake "Resend" that is always down. */
const brokenSender: EmailSender = {
  name: 'broken',
  async send() {
    throw new Error('Resend is down (503)');
  },
};

const contactMessage = { name: 'Demo User', email: 'demo@example.com', subject: 'Hello', message: 'Just testing the queue.' };

describe('endpoints only enqueue emails', () => {
  it('POST /api/contact answers 202 and leaves a pending job, without sending anything', async () => {
    const sender = recordingSender();
    const response = await request(app).post('/api/contact').send(contactMessage);

    expect(response.status).toBe(202);
    const [job] = await emailJobs();
    expect(job).toMatchObject({ template: 'contact_message_admin', status: 'pending', attempts: 0 });
    expect(sender.sent).toHaveLength(0);
  });
});

describe('the worker', () => {
  it('sends pending jobs and marks them sent', async () => {
    await request(app).post('/api/contact').send(contactMessage);
    const sender = recordingSender();

    const result = await processEmailBatch(sender);

    expect(result).toEqual({ claimed: 1, sent: 1, retried: 0, failed: 0 });
    expect(sender.sent[0].subject).toBe('[Contact] Hello');
    const [job] = await emailJobs();
    expect(job).toMatchObject({ status: 'sent', attempts: 1, last_error: null });
  });

  it('retries a failing email 4 times (5 attempts) and then marks it failed', async () => {
    await request(app).post('/api/contact').send(contactMessage);
    const statuses: string[] = [];

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await processEmailBatch(brokenSender);
      expect(result.claimed).toBe(1);
      const [job] = await emailJobs();
      statuses.push(`${job.attempts}:${job.status}`);
      if (job.status === 'pending') {
        // A retry is scheduled in the future, so the worker must not pick it up yet...
        expect(job.run_at.getTime()).toBeGreaterThan(Date.now());
        expect((await processEmailBatch(brokenSender)).claimed).toBe(0);
        // ...until the wait is over.
        await makePendingJobsDue();
      }
    }

    expect(statuses).toEqual(['1:pending', '2:pending', '3:pending', '4:pending', '5:failed']);
    const [job] = await emailJobs();
    expect(job.last_error).toContain('Resend is down');
    expect((await processEmailBatch(brokenSender)).claimed).toBe(0);
  });

  it('sends a job that failed once on the next try', async () => {
    await request(app).post('/api/contact').send(contactMessage);
    await processEmailBatch(brokenSender);
    await makePendingJobsDue();

    const result = await processEmailBatch(recordingSender());

    expect(result.sent).toBe(1);
    expect((await emailJobs())[0]).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('never sends the same job twice when two workers run at the same time', async () => {
    for (let i = 0; i < 6; i += 1) {
      await enqueueEmail({ to: `user${i}@example.com`, template: 'verify_email', payload: { fullName: 'User', verifyUrl: 'https://x/y?token=t' } });
    }
    const sender = recordingSender();

    const [first, second] = await Promise.all([processEmailBatch(sender), processEmailBatch(sender)]);

    expect(first.claimed + second.claimed).toBe(6);
    expect(new Set(sender.sent.map((email) => email.to)).size).toBe(6);
    expect(sender.sent).toHaveLength(6);
  });

  it('queues a job with a dedupe key only once', async () => {
    const input = { to: 'a@example.com', template: 'verify_email' as const, payload: { fullName: 'A', verifyUrl: 'https://x/y' }, dedupeKey: 'reminder:1' };
    await enqueueEmail(input);
    await enqueueEmail(input);
    expect(await emailJobs()).toHaveLength(1);
  });
});

describe('admin email queue endpoints', () => {
  async function adminCookie(): Promise<string> {
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
       VALUES ('admin@example.com', $1, 'Admin', 'admin', now())`,
      [await hashPassword('AdminPass123')],
    );
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'AdminPass123' });
    return (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  }

  it('lists failed jobs and puts one back in the queue', async () => {
    await request(app).post('/api/contact').send(contactMessage);
    for (let i = 0; i < 5; i += 1) {
      await processEmailBatch(brokenSender);
      await makePendingJobsDue();
    }
    const cookie = await adminCookie();

    const list = await request(app).get('/api/admin/email-jobs?status=failed').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].payload).toBeUndefined(); // private links never leave the backend

    const retry = await request(app).post(`/api/admin/email-jobs/${list.body.data[0].id}/retry`).set('Cookie', cookie);
    expect(retry.status).toBe(200);
    expect(retry.body.data).toMatchObject({ status: 'pending', attempts: 0 });

    const again = await request(app).post(`/api/admin/email-jobs/${list.body.data[0].id}/retry`).set('Cookie', cookie);
    expect(again.status).toBe(409);

    const stats = await request(app).get('/api/admin/email-jobs/stats').set('Cookie', cookie);
    expect(stats.body.data).toEqual({ pending: 1, sent: 0, failed: 0 });
  });

  it('is forbidden for customers', async () => {
    const register = await request(app)
      .post('/api/auth/register/customer')
      .send({ fullName: 'Sara Miller', email: 'sara@example.com', password: 'MySecret123' });
    const cookie = (register.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

    const response = await request(app).get('/api/admin/email-jobs').set('Cookie', cookie);
    expect(response.status).toBe(403);
  });
});
