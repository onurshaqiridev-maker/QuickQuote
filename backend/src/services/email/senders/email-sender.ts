import type { OutgoingEmail, SendResult } from '../../../models/dto/email.dto';

/**
 * Every way of sending email follows this shape. The worker does not care whether
 * the email goes to Resend or is printed in the terminal.
 */
export interface EmailSender {
  readonly name: string;
  /** Resolves when the provider accepted the email; throws if sending failed. */
  send(email: OutgoingEmail): Promise<SendResult>;
}
