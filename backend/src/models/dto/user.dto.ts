import type { UserRole, UserStatus } from '../enums';
import type { BusinessSummaryResponse, UserResponse } from '../responses/user.response';

/** Data needed to insert a new user row. */
export interface NewUser {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  emailVerified?: boolean;
}

/** The logged-in user, attached to each authenticated request. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
}

/** Result of registration/login: what to return to the client plus the session token to put in a cookie. */
export interface AuthResult {
  user: UserResponse;
  business?: BusinessSummaryResponse;
  sessionToken: string;
}
