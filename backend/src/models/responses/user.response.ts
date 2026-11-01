import type { BusinessStatus, UserRole, UserStatus } from '../enums';

/** A user as returned by the API (never includes the password hash). */
export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

/** Short business info returned to business owners after login/registration. */
export interface BusinessSummaryResponse {
  id: string;
  status: BusinessStatus;
  slug: string;
  displayName: string;
  isPublished: boolean;
}

export interface AuthResponse {
  user: UserResponse;
  business?: BusinessSummaryResponse;
}
