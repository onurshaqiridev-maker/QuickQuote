import { describe, expect, it } from 'vitest';
import { centsToInput, formatDuration, formatPrice, parsePriceToCents, plural, priceLabel } from './format';

describe('formatPrice', () => {
  it('shows whole euros without cents', () => {
    expect(formatPrice(1900)).toBe('€19');
  });

  it('shows cents when needed', () => {
    expect(formatPrice(2550)).toBe('€25.50');
  });
});

describe('price input helpers', () => {
  it('turns typed prices into cents', () => {
    expect(parsePriceToCents('45')).toBe(4500);
    expect(parsePriceToCents('45.5')).toBe(4550);
    expect(parsePriceToCents('45,50')).toBe(4550);
    expect(parsePriceToCents('abc')).toBeNull();
    expect(parsePriceToCents('4.555')).toBeNull();
  });

  it('turns cents back into an input value', () => {
    expect(centsToInput(4550)).toBe('45.50');
    expect(centsToInput(null)).toBe('');
  });

  it('labels prices for customers', () => {
    expect(priceLabel('fixed', 4500)).toBe('€45');
    expect(priceLabel('starting_from', 8950)).toBe('from €89.50');
    expect(priceLabel('on_request', null)).toBe('Price on request');
    expect(priceLabel('fixed', 0)).toBe('Free');
  });

  it('formats durations', () => {
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
  });
});

describe('plural', () => {
  it('adds an "s" unless there is exactly one', () => {
    expect(plural(1, 'reservation')).toBe('1 reservation');
    expect(plural(0, 'quote request')).toBe('0 quote requests');
    expect(plural(2, 'reservation')).toBe('2 reservations');
  });
});
