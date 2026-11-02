import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import { closePool } from '../../src/data/db';

/** A tiny pretend build of the website (what `npm run build` puts in frontend/dist). */
let dist: string;
beforeAll(() => {
  dist = mkdtempSync(path.join(tmpdir(), 'qq-website-'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Quick Quote</title><div id="root"></div>');
  writeFileSync(path.join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'assets', 'index-abc123.js'), 'console.log("app")');
});
afterAll(async () => {
  rmSync(dist, { recursive: true, force: true });
  await closePool();
});

describe('serving the website from the API server', () => {
  it('serves the home page and every page address with index.html', async () => {
    const app = createApp({ websiteDir: dist });
    for (const page of ['/', '/explore', '/businesses/bella-hair-studio', '/admin/customers?role=customer']) {
      const response = await request(app).get(page);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.text).toContain('<div id="root">');
    }
  });

  it('lets browsers keep the built files for a long time', async () => {
    const response = await request(createApp({ websiteDir: dist })).get('/assets/index-abc123.js');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
    expect((await request(createApp({ websiteDir: dist })).get('/favicon.svg')).status).toBe(200);
  });

  it('keeps the API, the health check and uploads separate from the website', async () => {
    const app = createApp({ websiteDir: dist });
    const unknownApi = await request(app).get('/api/does-not-exist');
    expect(unknownApi.status).toBe(404);
    expect(unknownApi.body.error.code).toBe('NOT_FOUND');
    expect((await request(app).get('/health')).headers['content-type']).toContain('application/json');
    expect((await request(app).get('/uploads/missing.png')).status).toBe(404);
  });

  it('sends security headers with the pages', async () => {
    const response = await request(createApp({ websiteDir: dist })).get('/');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('refuses to start when the website was not built', () => {
    expect(() => createApp({ websiteDir: path.join(dist, 'nothing-here') })).toThrow(/Build the website first/);
  });
});
