import { describe, expect, it } from 'vitest';
import { calculateSlots } from '../../src/services/availability.service';

const base = {
  timezone: 'Europe/Berlin',
  slotIntervalMinutes: 30,
  minNoticeHours: 2,
  maxAdvanceDays: 60,
  durationMinutes: 60,
  busy: [] as { start: Date; end: Date }[],
  now: new Date('2026-11-01T08:00:00Z'),
};

describe('calculateSlots', () => {
  it('matches the worked example in USER_FLOWS.md (lunch break + one booking)', () => {
    const slots = calculateSlots({
      ...base,
      date: '2026-11-10', // a Tuesday; Berlin is UTC+1 in November
      ranges: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '13:00', endTime: '17:00' }],
      busy: [{ start: new Date('2026-11-10T09:00:00Z'), end: new Date('2026-11-10T10:00:00Z') }], // 10:00-11:00 local
    });
    expect(slots.map((s) => s.localTime)).toEqual(['09:00', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']);
    expect(slots[0].startsAt).toBe('2026-11-10T08:00:00.000Z');
  });

  it('respects the minimum notice', () => {
    const slots = calculateSlots({
      ...base,
      date: '2026-11-01',
      now: new Date('2026-11-01T08:00:00Z'), // 09:00 local; with 2 hours notice the first slot is 11:00
      ranges: [{ startTime: '09:00', endTime: '13:00' }],
    });
    expect(slots.map((s) => s.localTime)).toEqual(['11:00', '11:30', '12:00']);
  });

  it('returns nothing in the past or beyond the booking window', () => {
    const ranges = [{ startTime: '09:00', endTime: '17:00' }];
    expect(calculateSlots({ ...base, date: '2026-10-31', ranges })).toEqual([]);
    expect(calculateSlots({ ...base, date: '2027-01-15', ranges })).toEqual([]);
    expect(calculateSlots({ ...base, date: 'not-a-date', ranges })).toEqual([]);
  });

  it('removes slots that overlap a blocked period, but allows back-to-back', () => {
    const slots = calculateSlots({
      ...base,
      date: '2026-11-10',
      ranges: [{ startTime: '09:00', endTime: '12:00' }],
      busy: [{ start: new Date('2026-11-10T09:00:00Z'), end: new Date('2026-11-10T09:30:00Z') }], // 10:00-10:30 local
    });
    // 09:00-10:00 ends exactly when the block starts: still free. 10:30 starts exactly when it ends: free.
    expect(slots.map((s) => s.localTime)).toEqual(['09:00', '10:30', '11:00']);
  });

  it('keeps local times correct across the daylight-saving change', () => {
    const ranges = [{ startTime: '09:00', endTime: '10:00' }];
    const winter = calculateSlots({ ...base, date: '2026-03-28', now: new Date('2026-03-01T00:00:00Z'), ranges });
    const summer = calculateSlots({ ...base, date: '2026-03-29', now: new Date('2026-03-01T00:00:00Z'), ranges });
    expect(winter).toEqual([{ startsAt: '2026-03-28T08:00:00.000Z', localTime: '09:00' }]); // UTC+1
    expect(summer).toEqual([{ startsAt: '2026-03-29T07:00:00.000Z', localTime: '09:00' }]); // UTC+2
  });

  it('uses the slot interval and the service duration', () => {
    const slots = calculateSlots({ ...base, date: '2026-11-10', slotIntervalMinutes: 15, durationMinutes: 45, ranges: [{ startTime: '09:00', endTime: '10:00' }] });
    expect(slots.map((s) => s.localTime)).toEqual(['09:00', '09:15']);
  });
});
