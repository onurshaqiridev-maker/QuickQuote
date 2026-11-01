import * as planRepository from '../data/repositories/plan.repository';
import type { PlanResponse } from '../models/responses/plan.response';
import { toPlanResponse } from './mappers';

/** Plans shown on the public pricing page. */
export async function listActivePlans(): Promise<PlanResponse[]> {
  const plans = await planRepository.listActive();
  return plans.map(toPlanResponse);
}
