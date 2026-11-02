/**
 * The "Request a quote" form on a business page.
 * The customer describes what they need; the business answers with a message and maybe a price.
 */
import { FileCheck2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError, errorMessage } from '../../api/client';
import { customerApi } from '../../api/customer.api';
import { useAuth } from '../../hooks/useAuth';
import type { PublicBusiness } from '../../types/api';
import { todayIn } from '../../utils/dates';
import { parsePriceToCents } from '../../utils/format';
import { CustomerOnly } from '../customer/CustomerOnly';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { SelectField, TextAreaField, TextField } from '../ui/FormField';

interface QuoteRequestPanelProps {
  business: PublicBusiness;
  /** The service the customer clicked on, or null for a general request */
  serviceId: string | null;
  onClose: () => void;
}

export function QuoteRequestPanel({ business, serviceId, onClose }: QuoteRequestPanelProps) {
  const { user } = useAuth();
  const services = business.services;
  const [form, setForm] = useState({
    serviceId: serviceId ?? '',
    subject: '',
    description: '',
    preferredDate: '',
    budget: '',
    phone: user?.phone ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const budgetCents = form.budget.trim() ? parsePriceToCents(form.budget) : null;
    if (form.budget.trim() && budgetCents === null) {
      setFieldErrors({ budgetCents: 'Enter an amount like 250 or 249.50.' });
      return;
    }
    setSending(true);
    setError(null);
    setFieldErrors({});
    try {
      await customerApi.requestQuote({
        businessId: business.id,
        serviceId: form.serviceId,
        subject: form.subject,
        description: form.description,
        preferredDate: form.preferredDate,
        budgetCents,
        phone: form.phone,
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
    } finally {
      setSending(false);
    }
  };

  const selected = services.find((service) => service.id === form.serviceId);

  return (
    <Dialog eyebrow={business.displayName} title="Request a quote" subtitle="Describe what you need. The business answers with a price and a message." onClose={onClose}>
      {sent ? (
        <div className="py-6 text-center">
          <FileCheck2 className="mx-auto h-12 w-12 text-green-600" aria-hidden />
          <h3 className="mt-4 text-lg font-semibold">Request sent!</h3>
          <p className="mt-2 text-sm text-slate-600">
            We sent your request to {business.displayName} and a copy to your email. You will get another email as soon as they answer.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <ButtonLink to="/account/quotes">My quote requests</ButtonLink>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <CustomerOnly action="request a quote" returnQuery={`?quote=${serviceId ?? 'general'}`}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <SelectField label="What is it about?" value={form.serviceId} onChange={set('serviceId')} error={fieldErrors.serviceId}>
              <option value="">General request</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </SelectField>
            <TextField
              label="Subject"
              required
              maxLength={150}
              value={form.subject}
              onChange={set('subject')}
              error={fieldErrors.subject}
              placeholder={selected ? `e.g. ${selected.name} for 2 people` : 'e.g. Renovate a small bathroom'}
            />
            <TextAreaField
              label="What do you need?"
              required
              rows={4}
              maxLength={3000}
              value={form.description}
              onChange={set('description')}
              error={fieldErrors.description}
              hint="The more details, the better the quote: size, number of people, special wishes."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Preferred date (optional)" type="date" min={todayIn(business.timezone)} value={form.preferredDate} onChange={set('preferredDate')} error={fieldErrors.preferredDate} />
              <TextField label="Budget in EUR (optional)" inputMode="decimal" placeholder="e.g. 250" value={form.budget} onChange={set('budget')} error={fieldErrors.budgetCents} />
            </div>
            <TextField label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={fieldErrors.phone} />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button type="submit" loading={sending}>Send request</Button>
            </div>
          </form>
        </CustomerOnly>
      )}
    </Dialog>
  );
}
