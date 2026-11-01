import { Resend } from 'resend';
import type { OutgoingEmail, SendResult } from '../../../models/dto/email.dto';
import type { EmailSender } from './email-sender';

/** Production sender: delivers the email through the Resend API. */
export function createResendSender(apiKey: string, from: string): EmailSender {
  const resend = new Resend(apiKey);
  return {
    name: 'resend',
    async send(email: OutgoingEmail): Promise<SendResult> {
      const { data, error } = await resend.emails.send(
        { from, to: email.to, subject: email.subject, html: email.html, text: email.text },
        // Resend ignores a repeated request with the same key, so one attempt is never sent twice.
        { idempotencyKey: email.idempotencyKey },
      );
      if (error) {
        throw new Error(`Resend rejected the email: ${error.name}: ${error.message}`);
      }
      return { providerMessageId: data?.id ?? null };
    },
  };
}
