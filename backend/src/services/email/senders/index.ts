import { env } from '../../../config/env';
import { consoleSender } from './console.sender';
import type { EmailSender } from './email-sender';
import { createResendSender } from './resend.sender';

let sender: EmailSender | undefined;

/** The sender chosen by EMAIL_DRIVER ("console" or "resend"). */
export function getEmailSender(): EmailSender {
  if (!sender) {
    sender =
      env.EMAIL_DRIVER === 'resend' && env.RESEND_API_KEY
        ? createResendSender(env.RESEND_API_KEY, env.EMAIL_FROM)
        : consoleSender;
  }
  return sender;
}

export type { EmailSender } from './email-sender';
