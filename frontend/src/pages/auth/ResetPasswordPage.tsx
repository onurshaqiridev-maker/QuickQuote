import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi } from '../../api/auth.api';
import { ApiError, errorMessage } from '../../api/client';
import { AuthCard } from '../../components/layout/AuthCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/FormField';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== repeat) {
      setErrors({ repeat: 'The two passwords are not the same.' });
      return;
    }
    setLoading(true);
    setErrors({});
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', { replace: true, state: { message: 'Password changed. Please log in.' } });
    } catch (err) {
      if (err instanceof ApiError) setErrors({ newPassword: err.fieldErrors().newPassword ?? '' });
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Reset password">
        <Alert tone="error">This link is incomplete. Please use the link from the email, or <Link to="/forgot-password" className="underline">request a new one</Link>.</Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" footer={<Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">Request a new link</Link>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.newPassword || undefined} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" />
        <TextField label="Repeat new password" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} error={errors.repeat} autoComplete="new-password" />
        <Button type="submit" loading={loading} fullWidth>Save new password</Button>
      </form>
    </AuthCard>
  );
}
