/**
 * The settings are checked when the program starts. These tests start a small separate program
 * with chosen settings, because the real settings are read only once per process.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const backend = path.resolve(__dirname, '../..');

function loadSettings(vars: Record<string, string>): { ok: boolean; output: string } {
  const result = spawnSync(
    path.join(backend, 'node_modules/.bin/tsx'),
    ['-e', `import(${JSON.stringify(path.join(backend, 'src/config/env.ts'))}).then((m) => console.log('FRONTEND_URL=' + m.env.FRONTEND_URL))`],
    {
      cwd: backend,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        VITEST: '1', // do not read backend/.env: only the settings given here count
        DATABASE_URL: 'postgres://x:y@localhost:5432/z',
        JWT_SECRET: 'a'.repeat(40),
        ...vars,
      },
    },
  );
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

describe('settings check at start-up', () => {
  it('refuses localhost links in production', () => {
    const result = loadSettings({ NODE_ENV: 'production' });
    expect(result.ok).toBe(false);
    expect(result.output).toContain('FRONTEND_URL must be the public website address in production');
  });

  it("uses Render's public address when FRONTEND_URL is not set", () => {
    const result = loadSettings({ NODE_ENV: 'production', RENDER_EXTERNAL_URL: 'https://quickquote.onrender.com' });
    expect(result.output).toContain('FRONTEND_URL=https://quickquote.onrender.com');
  });

  it('keeps an address that was set on purpose', () => {
    const result = loadSettings({ NODE_ENV: 'production', RENDER_EXTERNAL_URL: 'https://x.onrender.com', FRONTEND_URL: 'https://quickquote.example' });
    expect(result.output).toContain('FRONTEND_URL=https://quickquote.example');
  });
});
