import { useState, type FormEvent } from 'react';
import { businessApi } from '../../api/business.api';
import { ApiError, errorMessage } from '../../api/client';
import { AccountSettings } from '../../components/account/AccountSettings';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { SelectField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { BookingSettings } from '../../types/api';
import { TIMEZONES } from '../../utils/timezones';

const SLOT_INTERVALS = [10, 15, 20, 30, 45, 60];

function BookingSettingsForm({ initial }: { initial: BookingSettings }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const number = (key: keyof BookingSettings) => ({
    type: 'number',
    min: 0,
    value: String(form[key]),
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: Number(e.target.value) }),
    error: errors[key],
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setNotice(null);
    try {
      setForm(await businessApi.saveSettings(form));
      setNotice({ tone: 'success', text: 'Booking settings saved.' });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors());
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle>Booking settings</CardTitle>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Time zone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} error={errors.timezone} hint="Your working hours and appointment times use this time zone.">
            {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </SelectField>
          <SelectField label="Appointment start times" value={String(form.slotIntervalMinutes)} onChange={(e) => setForm({ ...form, slotIntervalMinutes: Number(e.target.value) })} error={errors.slotIntervalMinutes} hint="e.g. every 30 minutes: 09:00, 09:30, 10:00...">
            {SLOT_INTERVALS.map((minutes) => <option key={minutes} value={minutes}>Every {minutes} minutes</option>)}
          </SelectField>
          <TextField label="Minimum notice (hours)" {...number('minNoticeHours')} hint="How long before an appointment customers must book. 0-168." />
          <TextField label="Book up to (days ahead)" {...number('maxAdvanceDays')} hint="How far into the future customers can book. 1-365." />
          <TextField label="Free cancellation until (hours before)" {...number('cancellationNoticeHours')} hint="Customers can cancel online until this many hours before the start. 0-168." />
        </div>
        <Button type="submit" loading={saving}>Save booking settings</Button>
      </form>
    </Card>
  );
}

export function BusinessSettingsPage() {
  const settings = useApi('business-settings', () => businessApi.settings());
  return (
    <>
      <PageHeader title="Settings" description="Booking rules for your business, and your owner account." />
      {settings.error && <Alert tone="error">{settings.error}</Alert>}
      {settings.data ? <BookingSettingsForm initial={settings.data} /> : !settings.error && <Spinner />}
      <h2 className="text-lg font-semibold">Owner account</h2>
      <AccountSettings />
    </>
  );
}
