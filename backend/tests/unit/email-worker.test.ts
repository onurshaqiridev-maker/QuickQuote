import { describe, expect, it } from 'vitest';
import { RETRY_DELAYS_MINUTES, retryDelayMinutes } from '../../src/services/email/email-worker.service';
import { renderEmail } from '../../src/services/email/templates';
import { escapeHtml } from '../../src/services/email/templates/layout';

describe('retry schedule', () => {
  it('waits 1, 5, 15 and 60 minutes after attempts 1 to 4', () => {
    expect([1, 2, 3, 4].map(retryDelayMinutes)).toEqual([1, 5, 15, 60]);
  });

  it('gives at least 3 retries', () => {
    expect(RETRY_DELAYS_MINUTES.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps waiting 60 minutes if more attempts are configured', () => {
    expect(retryDelayMinutes(9)).toBe(60);
  });
});

describe('email templates', () => {
  it('renders subject, HTML and plain text', () => {
    const email = renderEmail('customer_welcome', { fullName: 'Sara', verifyUrl: 'https://example.com/v?token=abc' });
    expect(email.subject).toBe('Welcome to Quotiva!');
    expect(email.html).toContain('https://example.com/v?token=abc');
    expect(email.text).toContain('Hi Sara');
  });

  it('escapes user-written text so nobody can inject HTML', () => {
    const email = renderEmail('contact_message_admin', {
      name: 'Eve',
      email: 'eve@example.com',
      subject: 'Hi',
      message: '<script>alert(1)</script>',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(escapeHtml(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;');
  });

  it('refuses unknown templates', () => {
    expect(() => renderEmail('does_not_exist', {})).toThrow(/Unknown email template/);
  });
});
