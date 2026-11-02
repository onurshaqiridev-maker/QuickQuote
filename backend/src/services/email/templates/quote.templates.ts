/** Emails about quote requests. Prices and dates arrive already formatted. */
import type { EmailPayloads, QuoteEmailData, RenderedEmail } from '../../../models/dto/email.dto';
import { button, detailsTable, detailsText, layout, paragraph } from './layout';

function baseRows(data: QuoteEmailData): [string, string | null][] {
  return [
    ['Business', data.businessName],
    ['Subject', data.subject],
    ['Service', data.serviceName ?? 'General request'],
  ];
}

export function quoteNewBusiness(data: EmailPayloads['quote_new_business']): RenderedEmail {
  const title = 'New quote request';
  const contact = [data.customerEmail, data.customerPhone].filter(Boolean).join(', ');
  const rows: [string, string | null][] = [
    ...baseRows(data),
    ['Preferred date', data.preferredDate],
    ['Budget', data.budget],
    ['Customer', `${data.customerName} (${contact})`],
  ];
  const intro = `${data.customerName} would like a quote. Please answer with a price and a message, or decline the request.`;
  return {
    subject: `New quote request: ${data.subject}`,
    html: layout(
      title,
      paragraph(intro) + detailsTable(rows) + paragraph(`What they need:\n${data.description}`) + button(data.dashboardUrl, 'Answer the request'),
    ),
    text: `${title}\n\n${intro}\n\n${detailsText(rows)}\n\nWhat they need:\n${data.description}\n\n${data.dashboardUrl}`,
  };
}

export function quoteReceivedCustomer(data: EmailPayloads['quote_received_customer']): RenderedEmail {
  const title = 'Your quote request was sent';
  const intro = `We sent your request to ${data.businessName}. You will get an email as soon as they answer.`;
  return {
    subject: `Quote request sent to ${data.businessName}`,
    html: layout(
      title,
      paragraph(`Hi ${data.customerName},`) + paragraph(intro) + detailsTable(baseRows(data)) + button(data.accountUrl, 'My quote requests'),
    ),
    text: `Hi ${data.customerName},\n\n${intro}\n\n${detailsText(baseRows(data))}\n\n${data.accountUrl}`,
  };
}

const STATUS_TEXT: Record<EmailPayloads['quote_status_customer']['status'], { title: string; subject: string; intro: (business: string) => string }> = {
  processing: {
    title: 'Your quote is being prepared',
    subject: 'In progress',
    intro: (business) => `${business} is working on your quote. You will get another email when it is ready.`,
  },
  completed: {
    title: 'Your quote is ready',
    subject: 'Quote received',
    intro: (business) => `${business} answered your request. You can accept or decline the quote in your account.`,
  },
  rejected: {
    title: 'Your quote request was declined',
    subject: 'Declined',
    intro: (business) => `Sorry, ${business} cannot take on this request.`,
  },
};

export function quoteStatusCustomer(data: EmailPayloads['quote_status_customer']): RenderedEmail {
  const text = STATUS_TEXT[data.status];
  const rows: [string, string | null][] = [...baseRows(data), ['Price', data.price]];
  const message = data.message ? `Message from ${data.businessName}:\n${data.message}` : null;
  return {
    subject: `${text.subject}: ${data.subject}`,
    html: layout(
      text.title,
      paragraph(`Hi ${data.customerName},`) +
        paragraph(text.intro(data.businessName)) +
        detailsTable(rows) +
        (message ? paragraph(message) : '') +
        button(data.accountUrl, 'My quote requests'),
    ),
    text: `Hi ${data.customerName},\n\n${text.intro(data.businessName)}\n\n${detailsText(rows)}${message ? `\n\n${message}` : ''}\n\n${data.accountUrl}`,
  };
}

export function quoteDecisionBusiness(data: EmailPayloads['quote_decision_business']): RenderedEmail {
  const accepted = data.decision === 'accepted';
  const title = accepted ? 'A customer accepted your quote' : 'A customer declined your quote';
  const contact = [data.customerEmail, data.customerPhone].filter(Boolean).join(', ');
  const intro = accepted
    ? `Good news: ${data.customerName} accepted your quote. Please contact them to plan the next steps: ${contact}.`
    : `${data.customerName} declined your quote. No further action is needed.`;
  const rows: [string, string | null][] = [...baseRows(data), ['Price', data.price]];
  return {
    subject: `${accepted ? 'Quote accepted' : 'Quote declined'}: ${data.subject}`,
    html: layout(title, paragraph(intro) + detailsTable(rows) + button(data.dashboardUrl, 'Open quote requests')),
    text: `${title}\n\n${intro}\n\n${detailsText(rows)}\n\n${data.dashboardUrl}`,
  };
}
