import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError, errorMessage } from '../../api/client';
import { publicApi } from '../../api/public.api';
import { CategoryPicker } from '../../components/business/CategoryPicker';
import { AuthCard } from '../../components/layout/AuthCard';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/FormField';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { TIMEZONES } from '../../utils/timezones';

const ACCOUNT_FIELDS = ['fullName', 'email', 'password', 'phone'];


export function BusinessRegisterPage() {
  const { registerBusiness } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chosenPlan = params.get('plan');
  const categories = useApi('categories', () => publicApi.categories());

  const [step, setStep] = useState<1 | 2>(1);
  const [account, setAccount] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [business, setBusiness] = useState({
    businessName: '',
    city: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // guess from the browser
  });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const goToStep2 = (event: FormEvent) => {
    event.preventDefault();
    // Quick checks here; the backend checks everything again when we submit.
    const problems: Record<string, string> = {};
    if (account.fullName.trim().length < 2) problems.fullName = 'Please enter your name.';
    if (!account.email.includes('@')) problems.email = 'Please enter a valid email address.';
    if (account.password.length < 8) problems.password = 'Password must be at least 8 characters.';
    setErrors(problems);
    if (Object.keys(problems).length === 0) setStep(2);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setError(null);
    try {
      await registerBusiness({ ...account, phone: account.phone || undefined, ...business, categoryIds });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = err.fieldErrors();
        setErrors(fieldErrors);
        // A problem with the account fields? Go back to step 1 so the user can see it.
        if (Object.keys(fieldErrors).some((field) => ACCOUNT_FIELDS.includes(field)) || err.code === 'EMAIL_TAKEN') setStep(1);
      }
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      wide
      title="List your business on Quotiva"
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          Step {step} of 2: {step === 1 ? 'your account' : 'your business'}
          {chosenPlan && <Badge color="blue">Plan: {chosenPlan}</Badge>}
        </span>
      }
      footer={<>Already registered? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}
    >
      <div className="mb-6 flex gap-2" aria-hidden>
        <div className="h-1.5 flex-1 rounded-full bg-brand-600" />
        <div className={`h-1.5 flex-1 rounded-full ${step === 2 ? 'bg-brand-600' : 'bg-slate-200'}`} />
      </div>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {step === 1 ? (
        <form onSubmit={goToStep2} className="space-y-4" noValidate>
          <TextField label="Your full name" value={account.fullName} onChange={(e) => setAccount({ ...account, fullName: e.target.value })} error={errors.fullName} autoComplete="name" />
          <TextField label="Email (used to log in)" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} error={errors.email} autoComplete="email" />
          <TextField label="Password" type="password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} error={errors.password} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" />
          <TextField label="Phone (optional)" type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} error={errors.phone} autoComplete="tel" />
          <Button type="submit" fullWidth>Continue</Button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <TextField label="Business name" value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} error={errors.businessName} hint="This is the name customers will see." />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="City" value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} error={errors.city} autoComplete="address-level2" />
            <SelectField label="Time zone" value={business.timezone} onChange={(e) => setBusiness({ ...business, timezone: e.target.value })} error={errors.timezone} hint="Used for your appointment times.">
              {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </SelectField>
          </div>
          {categories.loading && <Spinner label="Loading categories…" />}
          {categories.error && <Alert tone="error">{categories.error}</Alert>}
          {categories.data && <CategoryPicker categories={categories.data} selected={categoryIds} onChange={setCategoryIds} error={errors.categoryIds} />}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" loading={loading} className="flex-1">Create business account</Button>
          </div>
          <p className="text-xs text-slate-500">After registering you confirm your email, choose a plan and complete your profile. Our team reviews every business before it goes public.</p>
        </form>
      )}
    </AuthCard>
  );
}
