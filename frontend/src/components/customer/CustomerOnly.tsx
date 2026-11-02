/**
 * Shows `children` only to a logged-in customer with a confirmed email.
 * Everyone else sees what to do first: log in (and come straight back), switch account, or confirm the email.
 */
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { EmailVerificationBanner } from '../layout/EmailVerificationBanner';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface CustomerOnlyProps {
  /** What the visitor wants to do, e.g. "book" or "request a quote" */
  action: string;
  /** Query string to add to the current page after logging in, e.g. "?book=123" (reopens the form) */
  returnQuery: string;
  children: ReactNode;
}

export function CustomerOnly({ action, returnQuery, children }: CustomerOnlyProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-sm text-slate-600">Log in or create a free account to {action}. You will come straight back here.</p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => navigate('/login', { state: { from: `${location.pathname}${returnQuery}` } })}>Log in to {action}</Button>
          <ButtonLink to="/register" variant="secondary">Create a free account</ButtonLink>
        </div>
      </div>
    );
  }
  if (user.role !== 'customer') {
    return <Alert tone="info">Only customer accounts can {action}. Please log out and use (or create) a customer account.</Alert>;
  }
  if (!user.emailVerified) return <EmailVerificationBanner />;
  return <>{children}</>;
}
