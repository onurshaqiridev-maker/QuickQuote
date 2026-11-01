/** Emails about accounts: welcome, email confirmation, password reset. */
import type { EmailPayloads, RenderedEmail } from '../../../models/dto/email.dto';
import { button, layout, paragraph } from './layout';

export function customerWelcome(data: EmailPayloads['customer_welcome']): RenderedEmail {
  const title = 'Welcome to Quick Quote!';
  return {
    subject: title,
    html: layout(
      title,
      paragraph(`Hi ${data.fullName},`) +
        paragraph('Thanks for joining Quick Quote. Please confirm your email address so you can book appointments and request quotes.') +
        button(data.verifyUrl, 'Confirm my email') +
        paragraph('This link is valid for 48 hours.'),
    ),
    text: `Hi ${data.fullName},\n\nThanks for joining Quick Quote. Please confirm your email address so you can book appointments and request quotes:\n${data.verifyUrl}\n\nThis link is valid for 48 hours.`,
  };
}

export function businessWelcome(data: EmailPayloads['business_welcome']): RenderedEmail {
  const title = `Welcome to Quick Quote, ${data.businessName}!`;
  return {
    subject: title,
    html: layout(
      title,
      paragraph(`Hi ${data.fullName},`) +
        paragraph(`Your business "${data.businessName}" has been created. First, please confirm your email address:`) +
        button(data.verifyUrl, 'Confirm my email') +
        paragraph('Next steps: choose a subscription plan, complete your profile, add your services and working hours. Our team will review your business before it appears publicly.') +
        button(data.dashboardUrl, 'Open my dashboard'),
    ),
    text: `Hi ${data.fullName},\n\nYour business "${data.businessName}" has been created. Confirm your email address:\n${data.verifyUrl}\n\nNext steps: choose a subscription plan, complete your profile, add your services and working hours. Our team will review your business before it appears publicly.\n\nDashboard: ${data.dashboardUrl}`,
  };
}

export function adminNewBusiness(data: EmailPayloads['admin_new_business']): RenderedEmail {
  const title = 'New business waiting for review';
  return {
    subject: `${title}: ${data.businessName}`,
    html: layout(
      title,
      paragraph(`Business: ${data.businessName} (${data.city})`) +
        paragraph(`Owner: ${data.ownerName} <${data.ownerEmail}>`) +
        paragraph('Please review it in the admin dashboard.'),
    ),
    text: `${title}\n\nBusiness: ${data.businessName} (${data.city})\nOwner: ${data.ownerName} <${data.ownerEmail}>\n\nPlease review it in the admin dashboard.`,
  };
}

export function verifyEmail(data: EmailPayloads['verify_email']): RenderedEmail {
  const title = 'Confirm your email address';
  return {
    subject: title,
    html: layout(
      title,
      paragraph(`Hi ${data.fullName},`) +
        paragraph('Click the button below to confirm your email address.') +
        button(data.verifyUrl, 'Confirm my email') +
        paragraph('This link is valid for 48 hours.'),
    ),
    text: `Hi ${data.fullName},\n\nConfirm your email address:\n${data.verifyUrl}\n\nThis link is valid for 48 hours.`,
  };
}

export function passwordReset(data: EmailPayloads['password_reset']): RenderedEmail {
  const title = 'Reset your password';
  return {
    subject: title,
    html: layout(
      title,
      paragraph(`Hi ${data.fullName},`) +
        paragraph('Someone (hopefully you) asked to reset your Quick Quote password.') +
        button(data.resetUrl, 'Choose a new password') +
        paragraph('This link is valid for 1 hour. If you did not ask for this, you can ignore this email.'),
    ),
    text: `Hi ${data.fullName},\n\nReset your password here (valid for 1 hour):\n${data.resetUrl}\n\nIf you did not ask for this, you can ignore this email.`,
  };
}
