/**
 * TypeScript types that match what the backend API returns.
 * (They mirror backend/src/models/responses.)
 */

export type UserRole = 'customer' | 'business_owner' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type BusinessStatus = 'pending_review' | 'approved' | 'suspended' | 'deactivated';
export type EmailJobStatus = 'pending' | 'sent' | 'failed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface BusinessSummary {
  id: string;
  status: BusinessStatus;
  slug: string;
  displayName: string;
  isPublished: boolean;
}

export interface AuthData {
  user: User;
  business?: BusinessSummary;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingInterval: 'month';
  maxServices: number | null;
  maxPhotos: number;
  isFeatured: boolean;
}

export interface EmailJob {
  id: string;
  toEmail: string;
  template: string;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailQueueStats {
  pending: number;
  sent: number;
  failed: number;
}

/** Every successful API response: { data } (lists also have meta). */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface PlatformConfig {
  /** false = free launch: businesses list for free. */
  subscriptionsRequired: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface FieldErrorDetail {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Business dashboard
// ---------------------------------------------------------------------------

export type PriceType = 'fixed' | 'starting_from' | 'on_request';
export type SubscriptionStatus = 'pending_payment' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface Photo {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface BusinessProfile {
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
  categories: Category[];
  photos: Photo[];
}

export interface Offering {
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

export interface WorkingHoursRange {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BlockedTime {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface BookingSettings {
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  cancellationNoticeHours: number;
}

export type ChecklistKey = 'email_verified' | 'subscription' | 'profile' | 'categories' | 'services' | 'working_hours' | 'approved' | 'published';

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  done: boolean;
  requiredToPublish: boolean;
}

export interface BusinessOverview {
  business: BusinessSummary;
  checklist: ChecklistItem[];
  canPublish: boolean;
  isVisible: boolean;
  /** false = free launch: no plan needed to go live. */
  subscriptionsRequired: boolean;
  usage: {
    planName: string | null;
    services: { used: number; limit: number | null };
    photos: { used: number; limit: number };
  };
  subscription: { status: SubscriptionStatus; planName: string; currentPeriodEnd: string | null } | null;
}
