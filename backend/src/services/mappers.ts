/**
 * Turn entities (database rows) into response models (what the API returns).
 * This is where we make sure private fields - like password hashes - never leave the backend.
 */
import type { BusinessPhoto } from '../models/entities/business-photo.entity';
import type { Business, BusinessProfile } from '../models/entities/business.entity';
import type { Offering } from '../models/entities/offering.entity';
import type { BlockedTime } from '../models/entities/schedule.entity';
import type { Category } from '../models/entities/category.entity';
import type { EmailJob } from '../models/entities/email-job.entity';
import type { SubscriptionPlan } from '../models/entities/subscription-plan.entity';
import type { User } from '../models/entities/user.entity';
import type {
  BlockedTimeResponse,
  BookingSettingsResponse,
  BusinessProfileResponse,
  OfferingResponse,
  PhotoResponse,
} from '../models/responses/business.response';
import type { CategoryResponse } from '../models/responses/category.response';
import type { EmailJobResponse } from '../models/responses/email-job.response';
import type { PlanResponse } from '../models/responses/plan.response';
import type { BusinessSummaryResponse, UserResponse } from '../models/responses/user.response';

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toBusinessSummaryResponse(business: Business, profile: BusinessProfile): BusinessSummaryResponse {
  return {
    id: business.id,
    status: business.status,
    slug: profile.slug,
    displayName: profile.displayName,
    isPublished: profile.isPublished,
  };
}

export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
  };
}

export function toEmailJobResponse(job: EmailJob): EmailJobResponse {
  return {
    id: job.id,
    toEmail: job.toEmail,
    template: job.template,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt.toISOString(),
    lastError: job.lastError,
    sentAt: job.sentAt ? job.sentAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
  };
}

export function toPlanResponse(plan: SubscriptionPlan): PlanResponse {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    maxServices: plan.maxServices,
    maxPhotos: plan.maxPhotos,
    isFeatured: plan.isFeatured,
  };
}

export function toPhotoResponse(photo: BusinessPhoto): PhotoResponse {
  return { id: photo.id, imageUrl: photo.imageUrl, caption: photo.caption, sortOrder: photo.sortOrder };
}

export function toBusinessProfileResponse(
  business: Business,
  profile: BusinessProfile,
  categories: Category[],
  photos: BusinessPhoto[],
): BusinessProfileResponse {
  return {
    id: business.id,
    status: business.status,
    slug: profile.slug,
    displayName: profile.displayName,
    description: profile.description,
    logoUrl: profile.logoUrl,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    websiteUrl: profile.websiteUrl,
    addressLine: profile.addressLine,
    city: profile.city,
    postalCode: profile.postalCode,
    country: profile.country,
    isPublished: profile.isPublished,
    publishedAt: profile.publishedAt ? profile.publishedAt.toISOString() : null,
    categories: categories.map(toCategoryResponse),
    photos: photos.map(toPhotoResponse),
  };
}

export function toOfferingResponse(offering: Offering): OfferingResponse {
  return {
    id: offering.id,
    name: offering.name,
    description: offering.description,
    priceType: offering.priceType,
    priceCents: offering.priceCents,
    durationMinutes: offering.durationMinutes,
    isBookable: offering.isBookable,
    isActive: offering.isActive,
    sortOrder: offering.sortOrder,
  };
}

export function toBlockedTimeResponse(blocked: BlockedTime): BlockedTimeResponse {
  return {
    id: blocked.id,
    startsAt: blocked.startsAt.toISOString(),
    endsAt: blocked.endsAt.toISOString(),
    reason: blocked.reason,
  };
}

export function toBookingSettingsResponse(business: Business): BookingSettingsResponse {
  return {
    timezone: business.timezone,
    slotIntervalMinutes: business.slotIntervalMinutes,
    minNoticeHours: business.minNoticeHours,
    maxAdvanceDays: business.maxAdvanceDays,
    cancellationNoticeHours: business.cancellationNoticeHours,
  };
}
