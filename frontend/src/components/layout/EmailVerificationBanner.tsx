import { useState } from 'react';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** Reminds logged-in users to confirm their email, with a "send again" button. */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setState('sending');
    try {
      setMessage((await authApi.resendVerification()).message);
      setState('sent');
    } catch (error) {
      setMessage(errorMessage(error));
      setState('error');
    }
  };

  const purpose = user.role === 'business_owner' ? 'publish your business profile' : 'book appointments and request quotes';

  return (
    <Alert tone={state === 'error' ? 'error' : 'warning'} title="Please confirm your email address">
      <p>
        We sent a confirmation link to <strong>{user.email}</strong>. You need to confirm it before you can {purpose}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={resend} loading={state === 'sending'} disabled={state === 'sent'}>
          {state === 'sent' ? 'Email sent' : 'Send the email again'}
        </Button>
        {message && <span>{message}</span>}
      </div>
    </Alert>
  );
}
