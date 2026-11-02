/** Emails about reservations. Dates arrive already formatted in the business's time zone. */
import type { EmailPayloads, RenderedEmail, ReservationEmailData } from '../../../models/dto/email.dto';
import { button, escapeHtml, layout, paragraph } from './layout';

/** A small table with the booking details. */
function detailsHtml(data: ReservationEmailData): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(value)}</td></tr>`;
  return `<table style="margin:0 0 16px;border-collapse:collapse;">${row('Business', data.businessName)}${row('Service', data.serviceName)}${row('When', data.when)}${data.price ? row('Price', data.price) : ''}</table>`;
}

function detailsText(data: ReservationEmailData): string {
  return `Business: ${data.businessName}\nService: ${data.serviceName}\nWhen: ${data.when}${data.price ? `\nPrice: ${data.price}` : ''}`;
}

export function reservationNewBusiness(data: EmailPayloads['reservation_new_business']): RenderedEmail {
  const title = 'New reservation request';
  const contact = [data.customerEmail, data.customerPhone].filter(Boolean).join(', ');
  return {
    subject: `New reservation: ${data.serviceName}, ${data.when}`,
    html: layout(
      title,
      paragraph(`${data.customerName} would like to book an appointment. Please confirm or reject it.`) +
        detailsHtml(data) +
        paragraph(`Customer: ${data.customerName} (${contact})`) +
        (data.customerNotes ? paragraph(`Notes: ${data.customerNotes}`) : '') +
        button(data.dashboardUrl, 'Confirm or reject'),
    ),
    text: `${title}\n\n${data.customerName} would like to book an appointment. Please confirm or reject it.\n\n${detailsText(data)}\nCustomer: ${data.customerName} (${contact})${data.customerNotes ? `\nNotes: ${data.customerNotes}` : ''}\n\n${data.dashboardUrl}`,
  };
}

export function reservationReceivedCustomer(data: EmailPayloads['reservation_received_customer']): RenderedEmail {
  const title = 'Your reservation request was sent';
  return {
    subject: `Request sent: ${data.serviceName} at ${data.businessName}`,
    html: layout(
      title,
      paragraph(`Hi ${data.customerName},`) +
        paragraph(`We sent your request to ${data.businessName}. You will get another email as soon as they confirm it.`) +
        detailsHtml(data) +
        button(data.accountUrl, 'My reservations'),
    ),
    text: `Hi ${data.customerName},\n\nWe sent your request to ${data.businessName}. You will get another email as soon as they confirm it.\n\n${detailsText(data)}\n\n${data.accountUrl}`,
  };
}

export function reservationConfirmedCustomer(data: EmailPayloads['reservation_confirmed_customer']): RenderedEmail {
  const title = 'Your appointment is confirmed';
  return {
    subject: `Confirmed: ${data.serviceName}, ${data.when}`,
    html: layout(
      title,
      paragraph(`Hi ${data.customerName},`) +
        paragraph(`Good news: ${data.businessName} confirmed your appointment.`) +
        detailsHtml(data) +
        (data.address ? paragraph(`Address: ${data.address}`) : '') +
        button(data.accountUrl, 'My reservations'),
    ),
    text: `Hi ${data.customerName},\n\nGood news: ${data.businessName} confirmed your appointment.\n\n${detailsText(data)}${data.address ? `\nAddress: ${data.address}` : ''}\n\n${data.accountUrl}`,
  };
}

export function reservationRejectedCustomer(data: EmailPayloads['reservation_rejected_customer']): RenderedEmail {
  const title = 'Your reservation request was declined';
  return {
    subject: `Not available: ${data.serviceName}, ${data.when}`,
    html: layout(
      title,
      paragraph(`Hi ${data.customerName},`) +
        paragraph(`Sorry, ${data.businessName} cannot take this appointment.`) +
        detailsHtml(data) +
        (data.message ? paragraph(`Message from ${data.businessName}: ${data.message}`) : '') +
        button(data.profileUrl, 'Choose another time'),
    ),
    text: `Hi ${data.customerName},\n\nSorry, ${data.businessName} cannot take this appointment.\n\n${detailsText(data)}${data.message ? `\n\nMessage from ${data.businessName}: ${data.message}` : ''}\n\nChoose another time: ${data.profileUrl}`,
  };
}

export function reservationCancelledCustomer(data: EmailPayloads['reservation_cancelled_customer']): RenderedEmail {
  const title = 'Your appointment was cancelled';
  const who = data.cancelledBy === 'system' ? 'This request was cancelled automatically.' : `${data.businessName} had to cancel your appointment.`;
  return {
    subject: `Cancelled: ${data.serviceName}, ${data.when}`,
    html: layout(
      title,
      paragraph(`Hi ${data.customerName},`) +
        paragraph(who) +
        detailsHtml(data) +
        (data.message ? paragraph(`Reason: ${data.message}`) : '') +
        button(data.profileUrl, 'Book another time'),
    ),
    text: `Hi ${data.customerName},\n\n${who}\n\n${detailsText(data)}${data.message ? `\n\nReason: ${data.message}` : ''}\n\nBook another time: ${data.profileUrl}`,
  };
}

export function reservationCancelledBusiness(data: EmailPayloads['reservation_cancelled_business']): RenderedEmail {
  const title = 'A customer cancelled an appointment';
  return {
    subject: `Cancelled by customer: ${data.serviceName}, ${data.when}`,
    html: layout(
      title,
      paragraph(`${data.customerName} cancelled this appointment. The time slot is free again.`) +
        detailsHtml(data) +
        (data.message ? paragraph(`Reason: ${data.message}`) : '') +
        button(data.dashboardUrl, 'Open reservations'),
    ),
    text: `${data.customerName} cancelled this appointment. The time slot is free again.\n\n${detailsText(data)}${data.message ? `\n\nReason: ${data.message}` : ''}\n\n${data.dashboardUrl}`,
  };
}
