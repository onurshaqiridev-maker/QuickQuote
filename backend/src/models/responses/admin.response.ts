import type { BusinessStatus, UserRole, UserStatus } from '../enums';
import type { BusinessProfileResponse, ChecklistItemResponse } from './business.response';
import type { BusinessQuoteResponse } from './quote.response';
import type { BusinessReservationResponse } from './reservation.response';

export interface AdminBusinessOwner {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
}

/** One row in the admin's business list. */
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

/** Everything the admin needs to decide about one business. */
export interface AdminBusinessDetail {
  id: string;
  status: BusinessStatus;
  statusReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  owner: AdminBusinessOwner;
  profile: BusinessProfileResponse;
  activeServices: number;
  checklist: ChecklistItemResponse[];
}

/** Numbers for the admin overview. "This week" = the last 7 days. */
export interface AdminStats {
  users: { customers: number; businessOwners: number; suspended: number };
  businesses: Record<BusinessStatus, number> & { visible: number };
  reservations: { createdThisWeek: number; pending: number };
  quotes: { createdThisWeek: number; open: number };
}

/** One line of the activity feed, e.g. "Sara Miller - reservation.created - Women's haircut at Bella Hair Studio". */
export interface AdminActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  /** A readable name for the thing that changed (a business name, a quote subject...), when it still exists */
  entityLabel: string | null;
  /** null = done by the system (e.g. the maintenance job) */
  actor: { id: string; fullName: string; role: UserRole } | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  statusReason: string | null;
  /** For customers: what they booked and asked for */
  counts: { reservations: number; quoteRequests: number };
  /** For business owners: their business */
  business: { id: string; displayName: string; status: BusinessStatus } | null;
}

/** A reservation in the admin's read-only list: the business's view plus which business it belongs to. */
export interface AdminReservationResponse extends BusinessReservationResponse {
  business: { id: string; slug: string; displayName: string };
}

/** A quote request in the admin's read-only list. */
export interface AdminQuoteResponse extends BusinessQuoteResponse {
  business: { id: string; slug: string; displayName: string };
}

export interface AdminCategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  /** How many businesses use it. Only unused categories can be deleted. */
  businessCount: number;
}
