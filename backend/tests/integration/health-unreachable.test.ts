import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';

// Runs BEFORE the imports below: point the app at a port where no database is listening.
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgres://quickquote:quickquote@127.0.0.1:1/quickquote_test';
});

import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';

afterAll(() => closePool());

describe('GET /health (database unreachable)', () => {
  it('returns 503 when PostgreSQL cannot be reached', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'error', checks: { app: 'ok', database: 'unreachable' } });
  });
});
