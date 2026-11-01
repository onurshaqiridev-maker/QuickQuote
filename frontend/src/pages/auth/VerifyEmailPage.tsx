import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { AuthCard } from '../../components/layout/AuthCard';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { homePathForRole } from '../../utils/roles';

/** Opened from the link in the welcome / confirmation email: /verify-email?token=... */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, refresh } = useAuth();
  const [state, setState] = useState<'checking' | 'done' | 'error'>(token ? 'checking' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This link is incomplete. Please use the link from the email.');
  const started = useRef(false); // React may run effects twice in development; send the token once.

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(async () => {
        setState('done');
        await refresh(); // update the "please confirm" banner
      })
      .catch((err: unknown) => {
        setState('error');
        setMessage(errorMessage(err));
      });
  }, [token, refresh]);

  return (
    <AuthCard title="Confirm your email">
      {state === 'checking' && <Spinner label="Confirming your email…" />}
      {state === 'done' && (
        <div className="space-y-4">
          <Alert tone="success" title="Your email address is confirmed.">Thank you! Your account is ready.</Alert>
          <ButtonLink to={user ? homePathForRole(user.role) : '/login'}>{user ? 'Go to my account' : 'Log in'}</ButtonLink>
        </div>
      )}
      {state === 'error' && (
        <div className="space-y-4">
          <Alert tone="error">{message}</Alert>
          <p className="text-sm text-slate-600">
            Log in and use <strong>“Send the email again”</strong> in your account to get a new link. <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
          </p>
        </div>
      )}
    </AuthCard>
  );
}
