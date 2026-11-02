/**
 * The list of all email templates: template name -> function that builds the email.
 * To add an email: add its payload to models/dto/email.dto.ts, write the function, register it here.
 */
import type { EmailPayloads, EmailTemplateName, RenderedEmail } from '../../../models/dto/email.dto';
import { adminNewBusiness, businessWelcome, customerWelcome, passwordReset, verifyEmail } from './account.templates';
import { businessApproved, businessSuspended } from './business.templates';
import { contactMessageAdmin } from './contact.templates';
import {
  reservationCancelledBusiness,
  reservationCancelledCustomer,
  reservationConfirmedCustomer,
  reservationNewBusiness,
  reservationReceivedCustomer,
  reservationRejectedCustomer,
} from './reservation.templates';

type TemplateRegistry = { [Name in EmailTemplateName]: (payload: EmailPayloads[Name]) => RenderedEmail };

const templates: TemplateRegistry = {
  customer_welcome: customerWelcome,
  business_welcome: businessWelcome,
  admin_new_business: adminNewBusiness,
  verify_email: verifyEmail,
  password_reset: passwordReset,
  contact_message_admin: contactMessageAdmin,
  business_approved: businessApproved,
  business_suspended: businessSuspended,
  reservation_new_business: reservationNewBusiness,
  reservation_received_customer: reservationReceivedCustomer,
  reservation_confirmed_customer: reservationConfirmedCustomer,
  reservation_rejected_customer: reservationRejectedCustomer,
  reservation_cancelled_customer: reservationCancelledCustomer,
  reservation_cancelled_business: reservationCancelledBusiness,
};

export function isKnownTemplate(name: string): name is EmailTemplateName {
  return Object.prototype.hasOwnProperty.call(templates, name);
}

/** Builds subject + HTML + text for a job taken from the queue. */
export function renderEmail(template: string, payload: Record<string, unknown>): RenderedEmail {
  if (!isKnownTemplate(template)) {
    throw new Error(`Unknown email template "${template}"`);
  }
  const build = templates[template] as (data: Record<string, unknown>) => RenderedEmail;
  return build(payload);
}
