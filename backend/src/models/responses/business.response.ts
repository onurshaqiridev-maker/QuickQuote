import type { BusinessStatus, PriceType, SubscriptionStatus } from '../enums';
import type { CategoryResponse } from './category.response';
import type { BusinessSummaryResponse } from './user.response';

export interface PhotoResponse {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

/** The owner's view of their profile (including unpublished data). */
export interface BusinessProfileResponse {
  id: string;
  status: BusinessStatus;
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  categories: CategoryResponse[];
  photos: PhotoResponse[];
}

export interface OfferingResponse {
  id: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  isBookable: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface WorkingHoursRangeResponse {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BlockedTimeResponse {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface BookingSettingsResponse {
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  cancellationNoticeHours: number;
}

export type ChecklistKey =
  | 'email_verified'
  | 'subscription'
  | 'profile'
  | 'categories'
  | 'services'
  | 'working_hours'
  | 'approved'
  | 'published';

export interface ChecklistItemResponse {
  key: ChecklistKey;
  label: string;
  done: boolean;
  /** true = must be done before "Publish" works */
  requiredToPublish: boolean;
}

export interface PlanUsageResponse {
  planName: string | null;
  services: { used: number; limit: number | null };
  photos: { used: number; limit: number };
}

export interface BusinessOverviewResponse {
  business: BusinessSummaryResponse;
  checklist: ChecklistItemResponse[];
  canPublish: boolean;
  /** Visible to the public right now (published + approved + subscription). */
  isVisible: boolean;
  usage: PlanUsageResponse;
  subscription: { status: SubscriptionStatus; planName: string; currentPeriodEnd: string | null } | null;
}
