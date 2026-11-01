/** Emails to business owners about their business status. */
import type { EmailPayloads, RenderedEmail } from '../../../models/dto/email.dto';
import { button, layout, paragraph } from './layout';

export function businessApproved(data: EmailPayloads['business_approved']): RenderedEmail {
  const title = `${data.businessName} is approved`;
  const next = data.isPublished
    ? 'Your profile is published, so customers can now find you on Quick Quote.'
    : 'Publish your profile from your dashboard and customers can find you on Quick Quote.';
  return {
    subject: `Good news: ${data.businessName} is approved`,
    html: layout(
      title,
      paragraph(`Hi ${data.fullName},`) +
        paragraph(`Our team has reviewed and approved ${data.businessName}. ${next}`) +
        button(data.isPublished ? data.profileUrl : data.dashboardUrl, data.isPublished ? 'See my public page' : 'Open my dashboard'),
    ),
    text: `Hi ${data.fullName},\n\nOur team has reviewed and approved ${data.businessName}. ${next}\n\n${data.isPublished ? data.profileUrl : data.dashboardUrl}`,
  };
}

export function businessSuspended(data: EmailPayloads['business_suspended']): RenderedEmail {
  const word = data.status === 'deactivated' ? 'deactivated' : 'suspended';
  const title = `${data.businessName} has been ${word}`;
  return {
    subject: title,
    html: layout(
      title,
      paragraph(`Hi ${data.fullName},`) +
        paragraph(`Your business ${data.businessName} has been ${word} and is no longer visible to customers.`) +
        paragraph(`Reason: ${data.reason}`) +
        paragraph('If you think this is a mistake, please contact us.') +
        button(data.contactUrl, 'Contact Quick Quote'),
    ),
    text: `Hi ${data.fullName},\n\nYour business ${data.businessName} has been ${word} and is no longer visible to customers.\n\nReason: ${data.reason}\n\nIf you think this is a mistake, contact us: ${data.contactUrl}`,
  };
}
