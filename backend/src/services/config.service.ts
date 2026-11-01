import { env } from '../config/env';
import type { PlatformConfigResponse } from '../models/responses/config.response';

/** Settings the public website needs (never secrets). */
export function getPlatformConfig(): PlatformConfigResponse {
  return { subscriptionsRequired: env.SUBSCRIPTIONS_REQUIRED };
}
