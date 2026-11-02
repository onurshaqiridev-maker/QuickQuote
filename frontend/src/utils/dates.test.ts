import { describe, expect, it } from 'vitest';
import { addDays, formatInZone, timeInZone, weekdayOf } from './dates';

describe('date helpers', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('knows the ISO weekday', () => {
    expect(weekdayOf('2026-11-09')).toBe(1); // Monday
    expect(weekdayOf('2026-11-15')).toBe(7); // Sunday
  });

  it('shows times in the business time zone', () => {
    expect(timeInZone('2026-11-10T08:30:00.000Z', 'Europe/Berlin')).toBe('09:30');
    expect(formatInZone('2026-11-10T08:30:00.000Z', 'Europe/Berlin')).toBe('Tue, 10 Nov 2026, 09:30');
  });
});
