/**
 * Small date helpers. Appointment times are always shown in the BUSINESS's time zone,
 * so "09:00" means 09:00 at the salon, wherever the customer's computer is.
 */

/** Today's date "YYYY-MM-DD" in a time zone. */
export function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** "2026-11-10" + 3 days -> "2026-11-13" (pure calendar arithmetic). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** ISO weekday of a "YYYY-MM-DD" date: 1 = Monday ... 7 = Sunday. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const sundayBased = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

/** For the date picker: { weekday: "Tue", day: "10", month: "Nov" } */
export function dateParts(date: string): { weekday: string; day: string; month: string } {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(value);
  return { weekday: format({ weekday: 'short' }), day: format({ day: 'numeric' }), month: format({ month: 'short' }) };
}

/** "Tuesday 10 November" for a "YYYY-MM-DD" date. */
export function longDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "Tue, 10 Nov 2026, 09:30" in the given time zone. */
export function formatInZone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone,
  }).format(new Date(iso));
}

/** "09:30" in the given time zone. */
export function timeInZone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(iso));
}
