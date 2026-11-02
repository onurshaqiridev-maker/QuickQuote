/** The business account: overview + go-live checklist, booking settings. */
import { env } from '../config/env';
import * as businessRepository from '../data/repositories/business.repository';
import * as offeringRepository from '../data/repositories/offering.repository';
import * as photoRepository from '../data/repositories/photo.repository';
import type { GoLiveFacts } from '../models/dto/business.dto';
import { DomainError, ForbiddenError, NotFoundError } from '../models/errors';
import type { BookingSettingsRequest } from '../models/requests/business.requests';
import type {
  BookingSettingsResponse,
  BusinessOverviewResponse,
  ChecklistItemResponse,
} from '../models/responses/business.response';
import { toBookingSettingsResponse, toBusinessSummaryResponse } from './mappers';
import { getBusinessQuoteCounts } from './quote.service';
import { getBusinessToday } from './reservation.service';
import { getCurrentSubscription, getPlanLimits } from './subscription.service';

/** The business owned by this user (every business route needs it). */
export async function getBusinessIdForOwner(ownerUserId: string): Promise<string> {
  const business = await businessRepository.findByOwnerUserId(ownerUserId);
  if (!business) throw new ForbiddenError('This account has no business.');
  return business.id;
}

/** Messages shown when "Publish" is clicked but something is missing. */
const MISSING_MESSAGES: Record<string, string> = {
  email_verified: 'Confirm your email address.',
  subscription: 'Choose a plan and pay for it.',
  profile: 'Add a description and your city to your profile.',
  categories: 'Choose at least one category.',
  services: 'Add at least one active service.',
  working_hours: 'Set your working hours (you have services that can be booked online).',
};

/**
 * The go-live checklist (see docs/USER_FLOWS.md, flow 2).
 * Items with requiredToPublish must be done before "Publish" works.
 * Admin approval is needed to be VISIBLE, but not to click "Publish".
 * During the free launch (SUBSCRIPTIONS_REQUIRED=false) there is no "choose a plan" step.
 */
export function buildChecklist(
  facts: GoLiveFacts,
  approved: boolean,
  published: boolean,
  subscriptionsRequired: boolean = env.SUBSCRIPTIONS_REQUIRED,
): ChecklistItemResponse[] {
  const items: ChecklistItemResponse[] = [
    { key: 'email_verified', label: 'Confirm your email address', done: facts.emailVerified, requiredToPublish: true },
    { key: 'subscription', label: 'Choose a plan and pay', done: facts.hasActiveSubscription, requiredToPublish: true },
    { key: 'profile', label: 'Complete your profile (description and city)', done: facts.hasDescription && facts.hasCity, requiredToPublish: true },
    { key: 'categories', label: 'Choose at least one category', done: facts.categoryCount > 0, requiredToPublish: true },
    { key: 'services', label: 'Add at least one active service', done: facts.activeServiceCount > 0, requiredToPublish: true },
    {
      key: 'working_hours',
      label: 'Set your working hours',
      // Only needed when customers can book online.
      done: facts.workingHoursCount > 0 || (facts.activeServiceCount > 0 && facts.bookableServiceCount === 0),
      requiredToPublish: true,
    },
    { key: 'approved', label: 'Approved by the Quotiva team', done: approved, requiredToPublish: false },
    { key: 'published', label: 'Publish your profile', done: published, requiredToPublish: false },
  ];
  return subscriptionsRequired ? items : items.filter((item) => item.key !== 'subscription');
}

/** Has the business paid, or is paying not needed (free launch)? */
export function subscriptionSatisfied(hasActiveSubscription: boolean): boolean {
  return hasActiveSubscription || !env.SUBSCRIPTIONS_REQUIRED;
}

/** Throws GO_LIVE_REQUIREMENTS_NOT_MET listing what is missing. */
export function assertCanPublish(checklist: ChecklistItemResponse[]): void {
  const missing = checklist.filter((item) => item.requiredToPublish && !item.done);
  if (missing.length > 0) {
    throw new DomainError(
      'GO_LIVE_REQUIREMENTS_NOT_MET',
      'Your profile is not ready to be published yet.',
      missing.map((item) => ({ field: item.key, message: MISSING_MESSAGES[item.key] ?? item.label })),
    );
  }
}

export async function getChecklist(businessId: string): Promise<ChecklistItemResponse[]> {
  const [business, profile, facts] = await Promise.all([
    businessRepository.findById(businessId),
    businessRepository.findProfileByBusinessId(businessId),
    businessRepository.getGoLiveFacts(businessId),
  ]);
  if (!business || !profile || !facts) throw new NotFoundError('Business not found.');
  return buildChecklist(facts, business.status === 'approved', profile.isPublished);
}

export async function getOverview(businessId: string): Promise<BusinessOverviewResponse> {
  const [business, profile, facts, limits, subscription, serviceCount, photoCount] = await Promise.all([
    businessRepository.findById(businessId),
    businessRepository.findProfileByBusinessId(businessId),
    businessRepository.getGoLiveFacts(businessId),
    getPlanLimits(businessId),
    getCurrentSubscription(businessId),
    offeringRepository.countActive(businessId),
    photoRepository.countByBusiness(businessId),
  ]);
  if (!business || !profile || !facts) throw new NotFoundError('Business not found.');

  const checklist = buildChecklist(facts, business.status === 'approved', profile.isPublished);
  const [reservations, quotes] = await Promise.all([getBusinessToday(businessId, business.timezone), getBusinessQuoteCounts(businessId)]);
  return {
    business: toBusinessSummaryResponse(business, profile),
    checklist,
    canPublish: checklist.every((item) => !item.requiredToPublish || item.done),
    isVisible: profile.isPublished && business.status === 'approved' && subscriptionSatisfied(facts.hasActiveSubscription),
    subscriptionsRequired: env.SUBSCRIPTIONS_REQUIRED,
    usage: {
      planName: limits.planName,
      services: { used: serviceCount, limit: limits.maxServices },
      photos: { used: photoCount, limit: limits.maxPhotos },
    },
    reservations,
    quotes,
    subscription: subscription
      ? {
          status: subscription.status,
          planName: subscription.planName,
          currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
        }
      : null,
  };
}

export async function getBookingSettings(businessId: string): Promise<BookingSettingsResponse> {
  const business = await businessRepository.findById(businessId);
  if (!business) throw new NotFoundError('Business not found.');
  return toBookingSettingsResponse(business);
}

export async function updateBookingSettings(businessId: string, input: BookingSettingsRequest): Promise<BookingSettingsResponse> {
  const business = await businessRepository.updateBookingSettings(businessId, input);
  if (!business) throw new NotFoundError('Business not found.');
  return toBookingSettingsResponse(business);
}
