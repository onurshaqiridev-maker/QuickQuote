import type { UserRole } from '../types/api';

/** Where each kind of user lands after logging in. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'business_owner':
      return '/dashboard';
    default:
      return '/account';
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  business_owner: 'Business owner',
  admin: 'Administrator',
};
