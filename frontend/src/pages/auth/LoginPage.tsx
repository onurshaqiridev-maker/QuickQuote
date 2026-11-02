import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { errorMessage } from '../../api/client';
import { AuthCard } from '../../components/layout/AuthCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/FormField';
import { useAuth } from '../../hooks/useAuth';
import { homePathForRole } from '../../utils/roles';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // If a protected page sent us here, go back there after logging in.
  const state = location.state as { from?: string; message?: string } | null;
  const from = state?.from;
  const notice = state?.message; // e.g. "Password changed. Please log in."

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await login(email, password);
      const safeFrom = from && from.startsWith('/') && !from.startsWith('//') ? from : null;
      navigate(safeFrom ?? homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back! Log in to your Quotiva account."
      footer={
        <>
          New here? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create a free account</Link> or{' '}
          <Link to="/register/business" className="font-semibold text-brand-700 hover:underline">list your business</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {notice && !error && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" loading={loading} fullWidth>Log in</Button>
      </form>
    </AuthCard>
  );
}
