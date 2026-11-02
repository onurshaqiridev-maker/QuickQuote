import { describe, expect, it } from 'vitest';
import type { EmailPayloads, EmailTemplateName } from '../../src/models/dto/email.dto';
import { renderEmail } from '../../src/services/email/templates';

/** Text a user could type, trying to put HTML into an email. */
const EVIL = '<script>alert("x")</script>';
const url = 'https://quickquote.example/link?token=abc';
const reservation = { businessName: 'Bella Hair Studio', serviceName: "Women's haircut", when: 'Tuesday, 10 November 2026 at 09:00', price: '€45.00' };
const quote = { businessName: 'Bella Hair Studio', subject: EVIL, serviceName: null };

/** One example for EVERY template. TypeScript reports a missing one, so new templates must be added here. */
const samples: { [Name in EmailTemplateName]: EmailPayloads[Name] } = {
  customer_welcome: { fullName: EVIL, verifyUrl: url },
  business_welcome: { fullName: EVIL, businessName: 'Bella', verifyUrl: url, dashboardUrl: url },
  admin_new_business: { businessName: EVIL, ownerName: 'Lena', ownerEmail: 'lena@example.com', city: 'Berlin' },
  verify_email: { fullName: EVIL, verifyUrl: url },
  password_reset: { fullName: EVIL, resetUrl: url },
  contact_message_admin: { name: EVIL, email: 'a@b.c', subject: 'Hi', message: EVIL },
  business_approved: { fullName: 'Lena', businessName: EVIL, isPublished: true, profileUrl: url, dashboardUrl: url },
  business_suspended: { fullName: 'Lena', businessName: 'Bella', status: 'suspended', reason: EVIL, contactUrl: url },
  reservation_new_business: { ...reservation, customerName: EVIL, customerEmail: 'sara@example.com', customerPhone: null, customerNotes: EVIL, dashboardUrl: url },
  reservation_received_customer: { ...reservation, customerName: EVIL, accountUrl: url },
  reservation_confirmed_customer: { ...reservation, customerName: EVIL, address: 'Main Street 1, Berlin', accountUrl: url },
  reservation_rejected_customer: { ...reservation, customerName: 'Sara', message: EVIL, profileUrl: url },
  reservation_cancelled_customer: { ...reservation, customerName: 'Sara', message: EVIL, cancelledBy: 'business', profileUrl: url },
  reservation_cancelled_business: { ...reservation, customerName: EVIL, message: null, dashboardUrl: url },
  quote_new_business: { ...quote, customerName: 'Sara', customerEmail: 'sara@example.com', customerPhone: '+49 151 1', description: EVIL, preferredDate: null, budget: '€250.00', dashboardUrl: url },
  quote_received_customer: { ...quote, customerName: 'Sara', accountUrl: url },
  quote_status_customer: { ...quote, customerName: 'Sara', status: 'completed', price: '€220.00', message: EVIL, accountUrl: url },
  quote_decision_business: { ...quote, customerName: 'Sara', customerEmail: 'sara@example.com', customerPhone: null, decision: 'accepted', price: null, dashboardUrl: url },
};

describe('email templates', () => {
  for (const [name, payload] of Object.entries(samples)) {
    it(`${name}: has a subject, HTML and text, and escapes what users typed`, () => {
      const email = renderEmail(name, payload as Record<string, unknown>);
      expect(email.subject.length).toBeGreaterThan(3);
      expect(email.html).toContain('<!DOCTYPE html>');
      expect(email.text.length).toBeGreaterThan(20);
      expect(email.html).not.toContain('<script>');
      // The plain-text version keeps the text as typed (it is never shown as HTML).
      if (JSON.stringify(payload).includes('<script>')) expect(email.html).toContain('&lt;script&gt;');
    });
  }

  it('refuses unknown templates', () => {
    expect(() => renderEmail('not_a_template', {})).toThrow('Unknown email template');
  });
});
