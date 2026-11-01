import type { BusinessStatus } from '../enums';
import type { BusinessProfileResponse, ChecklistItemResponse } from './business.response';

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
