import { Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { businessApi } from '../../api/business.api';
import { ApiError, errorMessage } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { WorkingHoursRange } from '../../types/api';
import { formatDateTime } from '../../utils/format';
import { DAY_NAMES } from '../../utils/timezones';

type Week = Record<number, { startTime: string; endTime: string }[]>;

function toWeek(ranges: WorkingHoursRange[]): Week {
  const week: Week = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const range of ranges) week[range.dayOfWeek].push({ startTime: range.startTime, endTime: range.endTime });
  return week;
}

function toRanges(week: Week): WorkingHoursRange[] {
  return Object.entries(week).flatMap(([day, ranges]) => ranges.map((range) => ({ dayOfWeek: Number(day), ...range })));
}

const TIME_INPUT = 'rounded-lg border-0 px-2 py-1.5 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none';

/** The weekly opening times: each day is closed or has one or more time ranges. */
function WeekEditor({ initial }: { initial: WorkingHoursRange[] }) {
  const [week, setWeek] = useState<Week>(() => toWeek(initial));
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (day: number, ranges: Week[number]) => setWeek({ ...week, [day]: ranges });

  const addRange = (day: number) => {
    const ranges = week[day];
    // A sensible default: 09:00-17:00, or an afternoon range after the last one.
    const next = ranges.length === 0 ? { startTime: '09:00', endTime: '17:00' } : { startTime: '13:00', endTime: '18:00' };
    update(day, [...ranges, next]);
  };

  const copyMondayToWeekdays = () => setWeek({ ...week, 2: [...week[1]], 3: [...week[1]], 4: [...week[1]], 5: [...week[1]] });

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      setWeek(toWeek(await businessApi.saveWorkingHours(toRanges(week))));
      setNotice({ tone: 'success', text: 'Working hours saved.' });
    } catch (error) {
      const detail = error instanceof ApiError ? error.details[0]?.message : undefined;
      setNotice({ tone: 'error', text: detail ? `${errorMessage(error)} ${detail}` : errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle action={<Button variant="ghost" onClick={copyMondayToWeekdays}>Copy Monday to Tuesday-Friday</Button>}>Weekly hours</CardTitle>
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      <ul className="divide-y divide-slate-100">
        {DAY_NAMES.map((name, index) => {
          const day = index + 1;
          const ranges = week[day];
          return (
            <li key={day} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
              <span className="w-28 pt-1.5 text-sm font-medium text-slate-800">{name}</span>
              <div className="flex-1 space-y-2">
                {ranges.length === 0 && <p className="pt-1.5 text-sm text-slate-400">Closed</p>}
                {ranges.map((range, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="time" aria-label={`${name} opens`} className={TIME_INPUT} value={range.startTime} onChange={(e) => update(day, ranges.map((r, j) => (j === i ? { ...r, startTime: e.target.value } : r)))} />
                    <span className="text-slate-400">to</span>
                    <input type="time" aria-label={`${name} closes`} className={TIME_INPUT} value={range.endTime} onChange={(e) => update(day, ranges.map((r, j) => (j === i ? { ...r, endTime: e.target.value } : r)))} />
                    <button type="button" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={() => update(day, ranges.filter((_, j) => j !== i))} aria-label={`Remove ${name} time range`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" onClick={() => addRange(day)}>
                <Plus className="h-4 w-4" aria-hidden /> {ranges.length === 0 ? 'Open this day' : 'Add break / range'}
              </Button>
            </li>
          );
        })}
      </ul>
      <Button className="mt-4" loading={saving} onClick={save}>Save working hours</Button>
    </Card>
  );
}

/** Holidays and other periods when nobody can book. */
function BlockedTimes() {
  const blocked = useApi('blocked-times', () => businessApi.blockedTimes());
  const [form, setForm] = useState({ startsAt: '', endsAt: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.startsAt || !form.endsAt) {
      setErrors({ startsAt: form.startsAt ? '' : 'Choose a start.', endsAt: form.endsAt ? '' : 'Choose an end.' });
      return;
    }
    setSaving(true);
    setErrors({});
    setNotice(null);
    try {
      // <input type="datetime-local"> gives local time; convert to an exact moment.
      await businessApi.addBlockedTime({ startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), reason: form.reason });
      setForm({ startsAt: '', endsAt: '', reason: '' });
      setNotice({ tone: 'success', text: 'Blocked time added.' });
      blocked.reload();
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors());
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await businessApi.deleteBlockedTime(id);
      blocked.reload();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    }
  };

  return (
    <Card>
      <CardTitle>Blocked times</CardTitle>
      <p className="mb-4 text-sm text-slate-600">Holidays, training days or appointments: customers cannot book during these periods. Times are in your computer's time zone.</p>
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      <form onSubmit={add} className="grid gap-4 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:items-start" noValidate>
        <TextField label="From" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} error={errors.startsAt || undefined} />
        <TextField label="Until" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} error={errors.endsAt || undefined} />
        <TextField label="Reason (private)" value={form.reason} maxLength={200} placeholder="e.g. Summer holiday" onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Button type="submit" loading={saving} className="sm:mt-7">Block</Button>
      </form>
      <ul className="mt-6 divide-y divide-slate-100">
        {blocked.data?.length === 0 && <li className="py-3 text-sm text-slate-500">No upcoming blocked times.</li>}
        {blocked.data?.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3 text-sm">
            <span className="flex-1">
              <span className="font-medium text-slate-800">{formatDateTime(item.startsAt)} – {formatDateTime(item.endsAt)}</span>
              {item.reason && <span className="ml-2 text-slate-500">{item.reason}</span>}
            </span>
            <button type="button" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove(item.id)} aria-label="Delete blocked time">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function WorkingHoursPage() {
  const hours = useApi('working-hours', () => businessApi.workingHours());
  return (
    <>
      <PageHeader title="Working hours" description="When customers can book you. Times are in your business's time zone (see Settings)." />
      {hours.error && <Alert tone="error">{hours.error}</Alert>}
      {hours.data ? <WeekEditor initial={hours.data} /> : !hours.error && <FullPageSpinner />}
      <BlockedTimes />
    </>
  );
}
