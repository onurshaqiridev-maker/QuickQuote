import type { BusinessStatus } from '../enums';

/** One row of the `businesses` table: the business account and its booking rules. */
export interface Business {
  id: string;
  ownerUserId: string;
  status: BusinessStatus;
  statusReason: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  cancellationNoticeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

/** One row of the `business_profiles` table: what the public sees. */
export interface BusinessProfile {
  businessId: string;
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
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
