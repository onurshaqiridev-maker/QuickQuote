import type { EmailPayloads, RenderedEmail } from '../../../models/dto/email.dto';
import { layout, paragraph } from './layout';

export function contactMessageAdmin(data: EmailPayloads['contact_message_admin']): RenderedEmail {
  const title = 'New contact form message';
  return {
    subject: `[Contact] ${data.subject}`,
    html: layout(
      title,
      paragraph(`From: ${data.name} <${data.email}>`) + paragraph(`Subject: ${data.subject}`) + paragraph(data.message),
    ),
    text: `${title}\n\nFrom: ${data.name} <${data.email}>\nSubject: ${data.subject}\n\n${data.message}`,
  };
}
