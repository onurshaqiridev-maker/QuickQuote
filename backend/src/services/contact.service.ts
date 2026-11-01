import { env } from '../config/env';
import type { ContactMessageRequest } from '../models/requests/contact.requests';
import { enqueueEmail } from './email/email-queue.service';

/** Contact form: queue an email to the platform admin (it is NOT sent during the request). */
export async function sendContactMessage(input: ContactMessageRequest): Promise<void> {
  await enqueueEmail({
    to: env.ADMIN_NOTIFICATION_EMAIL,
    template: 'contact_message_admin',
    payload: { name: input.name, email: input.email, subject: input.subject, message: input.message },
  });
}
