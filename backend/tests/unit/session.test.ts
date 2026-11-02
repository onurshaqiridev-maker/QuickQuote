import { describe, expect, it } from 'vitest';
import { readSessionToken, signSessionToken, startedBeforePasswordChange } from '../../src/services/session.service';

describe('session tokens', () => {
  it('can be read back, and refuse anything changed or made up', () => {
    const token = signSessionToken({ id: 'user-1', role: 'customer' });
    expect(readSessionToken(token)?.userId).toBe('user-1');
    const [header, , signature] = token.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ sub: 'admin-1', role: 'admin', iat: 1 })).toString('base64url');
    expect(readSessionToken(`${header}.${fakePayload}.${signature}`)).toBeNull();
    expect(readSessionToken('not-a-token')).toBeNull();
  });

  it('refuses tokens that use no signature at all', () => {
    const none = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
    expect(readSessionToken(`${none({ alg: 'none', typ: 'JWT' })}.${none({ sub: 'admin-1', iat: 1 })}.`)).toBeNull();
  });

  it('knows which sessions started before a password change', () => {
    const changed = new Date('2026-11-02T10:00:00.700Z');
    expect(startedBeforePasswordChange(new Date('2026-11-02T09:59:59.000Z'), changed)).toBe(true);
    // Tokens count whole seconds: a session made right after the change (same second) stays valid.
    expect(startedBeforePasswordChange(new Date('2026-11-02T10:00:00.000Z'), changed)).toBe(false);
    expect(startedBeforePasswordChange(new Date('2026-11-02T09:00:00.000Z'), null)).toBe(false);
  });
});
