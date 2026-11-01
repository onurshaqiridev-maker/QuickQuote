import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/api';
import { homePathForRole } from '../../utils/roles';
import { FullPageSpinner } from '../ui/Spinner';

/**
 * Only shows its children to logged-in users with one of the allowed roles.
 * - Not logged in  -> go to /login (and come back here afterwards)
 * - Wrong role     -> go to your own home page
 *
 * This is for a friendly experience only: the BACKEND checks every request again.
 */
export function ProtectedRoute({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (!roles.includes(user.role)) return <Navigate to={homePathForRole(user.role)} replace />;
  return <>{children}</>;
}

/** For login/register pages: logged-in users are sent to their own home page. */
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;
  return <>{children}</>;
}
