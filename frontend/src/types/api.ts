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
  reservations: { pendingCount: number; today: BusinessReservation[] };
}

// ---------------------------------------------------------------------------
// Public discovery
// ---------------------------------------------------------------------------

export interface PublicCategory {
  slug: string;
  name: string;
  icon: string | null;
}

export interface BusinessCard {
  id: string;
  slug: string;
  displayName: string;
  shortDescription: string | null;
  logoUrl: string | null;
  city: string | null;
  isFeatured: boolean;
  startingPriceCents: number | null;
  categories: PublicCategory[];
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  isBookable: boolean;
}

export interface PublicBusiness {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  isFeatured: boolean;
  timezone: string;
  booking: { maxAdvanceDays: number; minNoticeHours: number; cancellationNoticeHours: number };
  contact: { email: string | null; phone: string | null; websiteUrl: string | null };
  address: { line: string | null; city: string | null; postalCode: string | null; country: string | null };
  categories: PublicCategory[];
  photos: Photo[];
  services: PublicService[];
  workingHours: WorkingHoursRange[];
}

export interface City {
  name: string;
  businessCount: number;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminBusinessOwner {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
}

export interface AdminBusinessListItem {
  id: string;
  displayName: string;
  slug: string;
  city: string | null;
  status: BusinessStatus;
  isPublished: boolean;
  activeServices: number;
  owner: AdminBusinessOwner;
  createdAt: string;
}

export interface AdminBusinessDetail {
  id: string;
  status: BusinessStatus;
  statusReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  owner: AdminBusinessOwner;
  profile: BusinessProfile;
  activeServices: number;
  checklist: ChecklistItem[];
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Slot {
  startsAt: string;
  localTime: string;
}

export interface Availability {
  date: string;
  timezone: string;
  service: { id: string; name: string; durationMinutes: number };
  slots: Slot[];
}

export interface ReservationServiceInfo {
  id: string;
  name: string;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number;
}

export interface CustomerReservation {
  id: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  service: ReservationServiceInfo;
  business: { slug: string; displayName: string; logoUrl: string | null; city: string | null; addressLine: string | null; phone: string | null };
  customerNotes: string | null;
  businessMessage: string | null;
  cancelledBy: 'customer' | 'business' | 'system' | null;
  canCancel: boolean;
  cancelDeadline: string;
  createdAt: string;
}

export interface BusinessReservation {
  id: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  service: ReservationServiceInfo;
  customer: { name: string; email: string; phone: string | null; previousVisits: number };
  customerNotes: string | null;
  businessMessage: string | null;
  cancelledBy: 'customer' | 'business' | 'system' | null;
  canComplete: boolean;
  createdAt: string;
}

export interface CustomerOverview {
  upcoming: CustomerReservation[];
  counts: { upcoming: number; past: number; cancelled: number };
}
