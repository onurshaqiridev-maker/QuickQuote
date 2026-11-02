import type { AdminActivityItem } from '../types/api';

/** What each logged action means, as a short phrase. Unknown actions are shown as they are. */
const PHRASES: Record<string, string> = {
  'user.registered': 'created an account',
  'user.email_verified': 'confirmed their email',
  'user.password_reset': 'reset their password',
  'user.suspended': 'suspended the account of',
  'user.reactivated': 'reactivated the account of',
  'business.registered': 'registered the business',
  'business.published': 'published',
  'business.unpublished': 'hid',
  'business.approved': 'approved',
  'business.suspended': 'suspended',
  'business.deactivated': 'deactivated',
  'business.reactivated': 'reactivated',
  'reservation.created': 'booked',
  'reservation.confirmed': 'confirmed the booking',
  'reservation.rejected': 'rejected the booking',
  'reservation.cancelled': 'cancelled the booking',
  'reservation.completed': 'completed the booking',
  'reservation.expired': 'expired the unanswered booking',
  'quote.created': 'asked for a quote:',
  'quote.processing': 'started working on the quote',
  'quote.completed': 'sent a quote for',
  'quote.rejected': 'declined the quote request',
  'quote.accepted': 'accepted the quote',
  'quote.declined': 'declined the quote',
  'category.created': 'created the category',
  'category.updated': 'edited the category',
  'category.deleted': 'deleted the category',
};

/** "Sara Miller asked for a quote: Hair colour (Bella Hair Studio)" */
export function describeActivity(item: AdminActivityItem): string {
  const who = item.actor?.fullName ?? 'The system';
  const what = PHRASES[item.action] ?? item.action;
  const name = typeof item.metadata.name === 'string' ? item.metadata.name : null;
  const label = item.entityLabel ?? name;
  return label ? `${who} ${what} ${label}` : `${who} ${what}`;
}

/** The reason an admin gave (suspensions), if any. */
export function activityReason(item: AdminActivityItem): string | null {
  return typeof item.metadata.reason === 'string' ? item.metadata.reason : null;
}
