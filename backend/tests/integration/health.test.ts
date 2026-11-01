import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';

afterAll(() => closePool());

describe('GET /health (database reachable)', () => {
  it('returns 200 with app and database status', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({ status: 'ok', checks: { app: 'ok', database: 'ok' } });
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });
});

describe('GET /', () => {
  it('explains what this server is and where the health check is', async () => {
    const response = await request(createApp()).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Quick Quote API', health: '/health' });
  });
});
