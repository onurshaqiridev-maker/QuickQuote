import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { businessApi, type OfferingInput } from '../../api/business.api';
import { ApiError, errorMessage } from '../../api/client';
import { UsageMeter } from '../../components/business/UsageMeter';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { Offering, PriceType } from '../../types/api';
import { centsToInput, formatDuration, parsePriceToCents, priceLabel } from '../../utils/format';

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];

interface FormState {
  name: string;
  description: string;
  priceType: PriceType;
  price: string; // what the user types, e.g. "45.50"
  durationMinutes: string;
  isBookable: boolean;
}

const EMPTY_FORM: FormState = { name: '', description: '', priceType: 'fixed', price: '', durationMinutes: '60', isBookable: true };

function toFormState(service: Offering): FormState {
  return {
    name: service.name,
    description: service.description ?? '',
    priceType: service.priceType,
    price: centsToInput(service.priceCents),
    durationMinutes: service.durationMinutes ? String(service.durationMinutes) : '',
    isBookable: service.isBookable,
  };
}

/** Add or edit one service. */
function ServiceForm({ editing, onDone, onCancel }: { editing: Offering | null; onDone: (message: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState<FormState>(() => (editing ? toFormState(editing) : EMPTY_FORM));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const priceCents = form.priceType === 'on_request' ? null : parsePriceToCents(form.price);
    if (form.priceType !== 'on_request' && priceCents === null) {
      setErrors({ priceCents: 'Enter a price like 45 or 45.50.' });
      return;
    }
    const input: OfferingInput = {
      name: form.name,
      description: form.description,
      priceType: form.priceType,
      priceCents,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      isBookable: form.isBookable,
      ...(editing ? { isActive: editing.isActive } : {}),
    };
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      if (editing) await businessApi.updateService(editing.id, input);
      else await businessApi.createService(input);
      onDone(editing ? 'Service saved.' : 'Service added.');
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Card className="ring-2 ring-brand-500">
      <CardTitle>{editing ? `Edit "${editing.name}"` : 'Add a service'}</CardTitle>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="e.g. Women's haircut" />
        <TextAreaField label="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Price type" value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value as PriceType })}>
            <option value="fixed">Fixed price</option>
            <option value="starting_from">Starting from</option>
            <option value="on_request">Price on request</option>
          </SelectField>
          <TextField
            label="Price (EUR)"
            inputMode="decimal"
            value={form.priceType === 'on_request' ? '' : form.price}
            disabled={form.priceType === 'on_request'}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            error={errors.priceCents}
            placeholder="45.00"
          />
          <SelectField label="Duration" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} error={errors.durationMinutes}>
            <option value="">No fixed duration</option>
            {DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}
          </SelectField>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.isBookable} onChange={(e) => setForm({ ...form, isBookable: e.target.checked })} />
          <span>
            <span className="font-medium text-slate-800">Customers can book this online</span>
            <span className="block text-slate-500">Turn this off for work that needs a quote first (customers can then only request a quote).</span>
          </span>
        </label>
        <div className="flex gap-3">
          <Button type="submit" loading={saving}>{editing ? 'Save service' : 'Add service'}</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export function ManageServicesPage() {
  const services = useApi('business-services', () => businessApi.services());
  const overview = useApi('business-overview', () => businessApi.overview());
  const [editing, setEditing] = useState<Offering | 'new' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reloadAll = () => {
    services.reload();
    overview.reload();
  };

  const finishForm = (message: string) => {
    setEditing(null);
    setNotice({ tone: 'success', text: message });
    reloadAll();
  };

  const setActive = async (service: Offering, active: boolean) => {
    setBusyId(service.id);
    setNotice(null);
    try {
      if (active) {
        await businessApi.updateService(service.id, { ...service, description: service.description ?? '', isActive: true });
      } else {
        await businessApi.archiveService(service.id);
      }
      setNotice({ tone: 'success', text: active ? `"${service.name}" is active again.` : `"${service.name}" was archived.` });
      reloadAll();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  const usage = overview.data?.usage.services;
  const active = services.data?.filter((s) => s.isActive) ?? [];
  const archived = services.data?.filter((s) => !s.isActive) ?? [];

  return (
    <>
      <PageHeader
        title="Services"
        description="What you offer, with prices and durations."
        action={editing === null && <Button onClick={() => { setEditing('new'); setNotice(null); }}><Plus className="h-4 w-4" aria-hidden /> Add service</Button>}
      />
      {usage && <Card className="mb-6"><UsageMeter label={`Active services${overview.data?.usage.planName ? ` (${overview.data.usage.planName} plan)` : ' (Starter limits until you choose a plan)'}`} used={usage.used} limit={usage.limit} /></Card>}
      {notice && <div className="mb-6"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      {editing !== null && (
        <div className="mb-6">
          <ServiceForm key={editing === 'new' ? 'new' : editing.id} editing={editing === 'new' ? null : editing} onDone={finishForm} onCancel={() => setEditing(null)} />
        </div>
      )}

      <Card>
        <CardTitle>Active services</CardTitle>
        {services.loading && !services.data && <Spinner />}
        {services.error && <Alert tone="error">{services.error}</Alert>}
        {services.data && active.length === 0 && <p className="text-sm text-slate-500">No services yet. Add your first one: customers need at least one before you can publish.</p>}
        <ul className="divide-y divide-slate-100">
          {active.map((service) => (
            <li key={service.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{service.name}</p>
                {service.description && <p className="mt-0.5 truncate text-sm text-slate-500">{service.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{priceLabel(service.priceType, service.priceCents)}</span>
                  {service.durationMinutes && <span>· {formatDuration(service.durationMinutes)}</span>}
                  {service.isBookable ? <Badge color="blue">Bookable online</Badge> : <Badge>Quote only</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setEditing(service); setNotice(null); }}>Edit</Button>
                <Button variant="ghost" loading={busyId === service.id} onClick={() => setActive(service, false)}>Archive</Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {archived.length > 0 && (
        <Card>
          <CardTitle>Archived services</CardTitle>
          <p className="mb-2 text-sm text-slate-500">Hidden from customers, but kept for your booking history.</p>
          <ul className="divide-y divide-slate-100">
            {archived.map((service) => (
              <li key={service.id} className="flex items-center gap-3 py-3">
                <span className="flex-1 text-sm text-slate-600">{service.name} · {priceLabel(service.priceType, service.priceCents)}</span>
                <Button variant="secondary" loading={busyId === service.id} onClick={() => setActive(service, true)}>Restore</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
