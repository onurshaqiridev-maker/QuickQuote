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

/** "45.50" (what the user typed) -> 4550 cents. Returns null for empty or invalid input. */
export function parsePriceToCents(text: string): number | null {
  const normalised = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}

/** 4550 -> "45.50" (to fill a price input). */
export function centsToInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2);
}

/** "€45", "from €25" or "Price on request". */
export function priceLabel(priceType: 'fixed' | 'starting_from' | 'on_request', priceCents: number | null): string {
  if (priceType === 'on_request' || priceCents === null) return 'Price on request';
  if (priceCents === 0) return 'Free';
  return priceType === 'starting_from' ? `from ${formatPrice(priceCents)}` : formatPrice(priceCents);
}

/** 90 -> "1 h 30 min" */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}
