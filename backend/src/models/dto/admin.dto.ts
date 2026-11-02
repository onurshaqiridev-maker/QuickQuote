import type { BusinessStatus, UserRole, UserStatus } from '../enums';

/** A row of the admin business list, as read from the database. */
export interface AdminBusinessRow {
  id: string;
  displayName: string;
  slug: string;
  city: string | null;
  status: BusinessStatus;
  isPublished: boolean;
  activeServices: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  ownerEmailVerified: boolean;
  createdAt: Date;
}

/** A status change: only allowed when the current status is one of `from`. */
export interface BusinessStatusChange {
  to: BusinessStatus;
  from: BusinessStatus[];
  reason: string | null;
  /** null = the system (e.g. the demo seed) */
  adminUserId: string | null;
}

/** Platform numbers for the admin overview, as counted in the database. */
export interface AdminCountsRow {
  customers: number;
  businessOwners: number;
  suspendedUsers: number;
  businesses: Record<BusinessStatus, number>;
  reservationsThisWeek: number;
  pendingReservations: number;
  quotesThisWeek: number;
  openQuotes: number;
}

/** One activity log entry with the names the feed shows. */
export interface AdminActivityRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  actor: { id: string; fullName: string; role: UserRole } | null;
}

/** A user as the admin sees it, with counts. */
export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  statusReason: string | null;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  reservationCount: number;
  quoteCount: number;
  business: { id: string; displayName: string; status: BusinessStatus } | null;
}

/** A user status change: only allowed when the current status is one of `from`. */
export interface UserStatusChange {
  to: UserStatus;
  from: UserStatus[];
  reason: string | null;
}
