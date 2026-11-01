import type { Transaction } from '../data/db';
import * as activityRepository from '../data/repositories/activity.repository';
import type { NewActivity } from '../models/dto/activity.dto';

/** Records an important event (e.g. "user.registered") for the admin activity feed. */
export async function logActivity(activity: NewActivity, tx?: Transaction): Promise<void> {
  await activityRepository.insert(activity, tx);
}
