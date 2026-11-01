/** "€19" or "€19.50" (prices are stored in cents). */
export function formatPrice(cents: number, currency = 'EUR'): string {
  const wholeEuros = cents % 100 === 0;
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: wholeEuros ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** "1 Nov 2026, 15:43" in the visitor's own time zone. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
