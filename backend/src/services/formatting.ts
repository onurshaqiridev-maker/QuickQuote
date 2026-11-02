/** Small helpers that turn numbers and dates into text for emails. */
import { DateTime } from 'luxon';

/** 4500 -> "€45.00" */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** "2027-01-15" -> "Friday, 15 January 2027" */
export function formatLongDate(isoDate: string): string {
  return DateTime.fromISO(isoDate).setLocale('en-GB').toFormat('cccc, d LLLL yyyy');
}
