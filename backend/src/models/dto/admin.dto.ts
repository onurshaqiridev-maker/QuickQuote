import type { BusinessStatus } from '../enums';

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
  adminUserId: string;
}
