import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('shows whole euros without cents', () => {
    expect(formatPrice(1900)).toBe('€19');
  });

  it('shows cents when needed', () => {
    expect(formatPrice(2550)).toBe('€25.50');
  });
});
