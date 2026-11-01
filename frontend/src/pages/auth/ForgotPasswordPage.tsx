import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { AuthCard } from '../../components/layout/AuthCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/FormField';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { message } = await authApi.forgotPassword(email);
      setResult({ tone: 'success', text: message });
    } catch (err) {
      setResult({ tone: 'error', text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {result && <Alert tone={result.tone}>{result.text}</Alert>}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Button type="submit" loading={loading} fullWidth>Send reset link</Button>
      </form>
    </AuthCard>
  );
}
