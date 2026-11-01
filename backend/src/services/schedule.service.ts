/** Working hours and blocked times ("when can customers book?"). */
import { withTransaction } from '../data/db';
import * as scheduleRepository from '../data/repositories/schedule.repository';
import { NotFoundError, ValidationError } from '../models/errors';
import type { BlockedTimeRequest, WorkingHoursRequest } from '../models/requests/business.requests';
import type { BlockedTimeResponse, WorkingHoursRangeResponse } from '../models/responses/business.response';
import { toBlockedTimeResponse } from './mappers';

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export async function getWorkingHours(businessId: string): Promise<WorkingHoursRangeResponse[]> {
  const ranges = await scheduleRepository.listWorkingHours(businessId);
  return ranges.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
}

/** Time ranges on the same day must not overlap (e.g. 09:00-12:00 and 11:00-14:00). */
export function findOverlap(ranges: WorkingHoursRequest['ranges']): string | null {
  const sorted = [...ranges].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    // "HH:MM" strings compare correctly as text.
    if (current.dayOfWeek === previous.dayOfWeek && current.startTime < previous.endTime) {
      return `${DAY_NAMES[current.dayOfWeek]}: ${previous.startTime}-${previous.endTime} overlaps ${current.startTime}-${current.endTime}.`;
    }
  }
  return null;
}

/** Replaces the whole week in one go. */
export async function replaceWorkingHours(businessId: string, input: WorkingHoursRequest): Promise<WorkingHoursRangeResponse[]> {
  const overlap = findOverlap(input.ranges);
  if (overlap) throw new ValidationError([{ field: 'ranges', message: overlap }]);
  await withTransaction((tx) => scheduleRepository.replaceWorkingHours(businessId, input.ranges, tx));
  return getWorkingHours(businessId);
}

export async function listBlockedTimes(businessId: string): Promise<BlockedTimeResponse[]> {
  return (await scheduleRepository.listUpcomingBlockedTimes(businessId)).map(toBlockedTimeResponse);
}

export async function addBlockedTime(businessId: string, input: BlockedTimeRequest): Promise<BlockedTimeResponse> {
  const blocked = await scheduleRepository.insertBlockedTime({
    businessId,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    reason: input.reason ?? null,
  });
  return toBlockedTimeResponse(blocked);
}

export async function deleteBlockedTime(businessId: string, id: string): Promise<void> {
  if (!(await scheduleRepository.deleteBlockedTime(businessId, id))) throw new NotFoundError('Blocked time not found.');
}
