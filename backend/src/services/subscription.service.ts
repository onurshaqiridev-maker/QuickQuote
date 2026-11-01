/**
 * Subscription questions other services may ask. (Full subscription management comes in phase 6.)
 * Other services never read the subscription tables themselves; they ask here.
 */
import * as planRepository from '../data/repositories/plan.repository';
import * as subscriptionRepository from '../data/repositories/subscription.repository';
import type { PlanLimits } from '../models/dto/business.dto';
import type { SubscriptionWithPlan } from '../models/entities/subscription.entity';

/** Used if no plan exists at all (e.g. the seed has not run). Same as the Starter plan. */
const FALLBACK_LIMITS: PlanLimits = { planName: null, maxServices: 10, maxPhotos: 5, isFeatured: false };

export async function getCurrentSubscription(businessId: string): Promise<SubscriptionWithPlan | null> {
  return subscriptionRepository.findCurrent(businessId);
}

export async function hasActiveSubscription(businessId: string): Promise<boolean> {
  const subscription = await subscriptionRepository.findCurrent(businessId);
  return subscription !== null && (subscription.status === 'active' || subscription.status === 'past_due');
}

/**
 * What the business may use. With an active subscription: its plan's limits.
 * Without one: the cheapest plan's limits. That covers both a new business preparing its
 * profile before paying, and every business during the free launch (SUBSCRIPTIONS_REQUIRED=false).
 */
export async function getPlanLimits(businessId: string): Promise<PlanLimits> {
  const subscription = await subscriptionRepository.findCurrent(businessId);
  if (subscription && (subscription.status === 'active' || subscription.status === 'past_due')) {
    return {
      planName: subscription.planName,
      maxServices: subscription.maxServices,
      maxPhotos: subscription.maxPhotos,
      isFeatured: subscription.isFeatured,
    };
  }
  const cheapest = await planRepository.findCheapestActive();
  if (!cheapest) return FALLBACK_LIMITS;
  return { planName: null, maxServices: cheapest.maxServices, maxPhotos: cheapest.maxPhotos, isFeatured: false };
}
