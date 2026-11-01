import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, errorMessage } from '../../api/client';
import { AuthCard } from '../../components/layout/AuthCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/FormField';
import { useAuth } from '../../hooks/useAuth';

const EMPTY = { fullName: '', email: '', password: '', phone: '' };

export function CustomerRegisterPage() {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setError(null);
    try {
      await registerCustomer({ ...form, phone: form.phone || undefined });
      navigate('/account', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your free account"
      subtitle="Request quotes and book appointments with local businesses. Free, always."
      footer={
        <>
          Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
          <br />
          Are you a business? <Link to="/register/business" className="font-semibold text-brand-700 hover:underline">Register your business</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Full name" value={form.fullName} onChange={update('fullName')} error={errors.fullName} autoComplete="name" />
        <TextField label="Email" type="email" value={form.email} onChange={update('email')} error={errors.email} autoComplete="email" />
        <TextField label="Password" type="password" value={form.password} onChange={update('password')} error={errors.password} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" />
        <TextField label="Phone (optional)" type="tel" value={form.phone} onChange={update('phone')} error={errors.phone} autoComplete="tel" />
        <Button type="submit" loading={loading} fullWidth>Create account</Button>
        <p className="text-center text-xs text-slate-500">We will send you an email to confirm your address.</p>
      </form>
    </AuthCard>
  );
}
