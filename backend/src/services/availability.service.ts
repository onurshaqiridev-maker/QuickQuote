/**
 * Works out the free time slots for one business, one service and one date.
 * See docs/USER_FLOWS.md, section 4.2.
 *
 * Working hours are LOCAL times ("09:00" in Europe/Berlin); reservations are exact moments (UTC).
 * Luxon converts between the two and handles daylight-saving time correctly.
 */
import { DateTime } from 'luxon';
import { env } from '../config/env';
import * as offeringRepository from '../data/repositories/offering.repository';
import * as publicBusinessRepository from '../data/repositories/public-business.repository';
import * as reservationRepository from '../data/repositories/reservation.repository';
import * as scheduleRepository from '../data/repositories/schedule.repository';
import type { PublicBusinessRow } from '../models/dto/discovery.dto';
import type { SlotCalculationInput, TimeRange } from '../models/dto/reservation.dto';
import type { Offering } from '../models/entities/offering.entity';
import { NotFoundError, ValidationError } from '../models/errors';
import type { AvailabilityResponse, SlotResponse } from '../models/responses/reservation.response';

function overlaps(start: Date, end: Date, range: TimeRange): boolean {
  return start < range.end && end > range.start;
}

/** The pure calculation: no database, so it is easy to test. */
export function calculateSlots(input: SlotCalculationInput): SlotResponse[] {
  const day = DateTime.fromISO(input.date, { zone: input.timezone });
  if (!day.isValid) return [];
  const today = DateTime.fromJSDate(input.now, { zone: input.timezone }).startOf('day');
  if (day < today || day > today.plus({ days: input.maxAdvanceDays })) return [];

  const earliest = input.now.getTime() + input.minNoticeHours * 3_600_000;
  const slots: SlotResponse[] = [];

  for (const range of input.ranges) {
    const [openHour, openMinute] = range.startTime.split(':').map(Number);
    const [closeHour, closeMinute] = range.endTime.split(':').map(Number);
    const opens = day.set({ hour: openHour, minute: openMinute, second: 0, millisecond: 0 });
    const closes = day.set({ hour: closeHour, minute: closeMinute, second: 0, millisecond: 0 });

    for (let start = opens; start.plus({ minutes: input.durationMinutes }) <= closes; start = start.plus({ minutes: input.slotIntervalMinutes })) {
      const startDate = start.toJSDate();
      const endDate = start.plus({ minutes: input.durationMinutes }).toJSDate();
      if (startDate.getTime() < earliest) continue; // too soon
      if (input.busy.some((busy) => overlaps(startDate, endDate, busy))) continue; // taken or blocked
      slots.push({ startsAt: startDate.toISOString(), localTime: start.toFormat('HH:mm') });
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** A service that can be booked online at this business, or NOT_FOUND. */
export async function findBookableService(businessId: string, serviceId: string): Promise<Offering & { durationMinutes: number }> {
  const service = await offeringRepository.findForBusiness(businessId, serviceId);
  if (!service || !service.isActive || !service.isBookable || !service.durationMinutes) {
    throw new NotFoundError('This service cannot be booked online.');
  }
  return service as Offering & { durationMinutes: number };
}

/** Loads everything for one date and calculates the slots. */
export async function slotsFor(business: PublicBusinessRow, service: Offering & { durationMinutes: number }, date: string, now = new Date()): Promise<SlotResponse[]> {
  const day = DateTime.fromISO(date, { zone: business.timezone });
  if (!day.isValid) throw new ValidationError([{ field: 'date', message: 'This date does not exist.' }]);
  const from = day.startOf('day').toJSDate();
  const to = day.endOf('day').toJSDate();

  const [hours, reservations, blocked] = await Promise.all([
    scheduleRepository.listWorkingHours(business.id),
    reservationRepository.listActiveBetween(business.id, from, to),
    scheduleRepository.listBlockedBetween(business.id, from, to),
  ]);

  return calculateSlots({
    date,
    timezone: business.timezone,
    slotIntervalMinutes: business.slotIntervalMinutes,
    minNoticeHours: business.minNoticeHours,
    maxAdvanceDays: business.maxAdvanceDays,
    durationMinutes: service.durationMinutes,
    ranges: hours.filter((range) => range.dayOfWeek === day.weekday),
    busy: [...reservations, ...blocked],
    now,
  });
}

/** GET /api/businesses/:slug/availability */
export async function getAvailability(slug: string, serviceId: string, date: string): Promise<AvailabilityResponse> {
  const business = await publicBusinessRepository.findVisibleBySlug(slug, env.SUBSCRIPTIONS_REQUIRED);
  if (!business) throw new NotFoundError('This business is not available.');
  const service = await findBookableService(business.id, serviceId);
  return {
    date,
    timezone: business.timezone,
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes },
    slots: await slotsFor(business, service, date),
  };
}
