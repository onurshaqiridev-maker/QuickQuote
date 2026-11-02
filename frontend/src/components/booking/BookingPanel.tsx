/**
 * The booking dialog on a business page:
 *   1. choose a day   2. choose a free time   3. add notes   4. confirm
 * Times are shown in the business's time zone.
 */
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError, errorMessage } from '../../api/client';
import { customerApi } from '../../api/customer.api';
import { publicApi } from '../../api/public.api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import type { PublicBusiness, PublicService } from '../../types/api';
import { formatDuration, priceLabel } from '../../utils/format';
import { addDays, dateParts, longDate, todayIn, weekdayOf } from '../../utils/dates';
import { CustomerOnly } from '../customer/CustomerOnly';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { TextAreaField, TextField } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';

const DAYS_PER_PAGE = 7;

function DayPicker({ business, selected, onSelect }: { business: PublicBusiness; selected: string | null; onSelect: (date: string) => void }) {
  const today = todayIn(business.timezone);
  const lastDay = addDays(today, business.booking.maxAdvanceDays);
  const openDays = new Set(business.workingHours.map((range) => range.dayOfWeek));
  const [offset, setOffset] = useState(0);
  const days = Array.from({ length: DAYS_PER_PAGE }, (_, i) => addDays(today, offset + i)).filter((day) => day <= lastDay);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">1. Choose a day</h3>
        <div className="flex gap-1">
          <button type="button" aria-label="Earlier days" disabled={offset === 0} onClick={() => setOffset(offset - DAYS_PER_PAGE)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Later days" disabled={addDays(today, offset + DAYS_PER_PAGE) > lastDay} onClick={() => setOffset(offset + DAYS_PER_PAGE)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const parts = dateParts(day);
          const closed = !openDays.has(weekdayOf(day));
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              disabled={closed}
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${longDate(day)}${closed ? ' (closed)' : ''}`}
              className={`flex flex-col items-center rounded-lg py-2 text-xs ring-1 transition ${
                isSelected ? 'bg-brand-600 text-white ring-brand-600' : closed ? 'cursor-not-allowed text-slate-300 ring-slate-100' : 'text-slate-700 ring-slate-200 hover:ring-brand-500'
              }`}
            >
              <span>{parts.weekday}</span>
              <span className="text-base font-semibold">{parts.day}</span>
              <span>{parts.month}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({ business, service, date, selected, onSelect, reloadKey }: { business: PublicBusiness; service: PublicService; date: string; selected: string | null; onSelect: (startsAt: string) => void; reloadKey: number }) {
  const { data, loading, error } = useApi(`availability/${business.slug}/${service.id}/${date}/${reloadKey}`, () => publicApi.availability(business.slug, service.id, date));
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">2. Choose a time <span className="font-normal text-slate-500">on {longDate(date)}</span></h3>
      {loading && <Spinner label="Looking for free times…" />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && data.slots.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No free times on this day. Please try another day.</p>}
      {data && data.slots.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {data.slots.map((slot) => (
            <button
              key={slot.startsAt}
              type="button"
              onClick={() => onSelect(slot.startsAt)}
              aria-pressed={slot.startsAt === selected}
              className={`rounded-lg py-2 text-sm font-medium ring-1 ${slot.startsAt === selected ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:ring-brand-500'}`}
            >
              {slot.localTime}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">Times are local to {business.displayName} ({business.timezone.replace('_', ' ')}).</p>
    </div>
  );
}

export function BookingPanel({ business, service, onClose }: { business: PublicBusiness; service: PublicService; onClose: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [booked, setBooked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedTime = useMemo(
    () => (startsAt ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: business.timezone }).format(new Date(startsAt)) : null),
    [startsAt, business.timezone],
  );

  const confirm = async () => {
    if (!startsAt) return;
    setSending(true);
    setError(null);
    setFieldErrors({});
    try {
      await customerApi.book({ businessId: business.id, serviceId: service.id, startsAt, notes, phone });
      setBooked(true);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors());
        if (err.code === 'SLOT_UNAVAILABLE') {
          setStartsAt(null);
          setReloadKey((k) => k + 1); // show the up-to-date free times
        }
      }
    } finally {
      setSending(false);
    }
  };

  let body: React.ReactNode;
  if (booked) {
    body = (
      <div className="py-6 text-center">
        <CalendarCheck className="mx-auto h-12 w-12 text-green-600" aria-hidden />
        <h3 className="mt-4 text-lg font-semibold">Request sent!</h3>
        <p className="mt-2 text-sm text-slate-600">
          {business.displayName} will confirm your appointment on {date && longDate(date)} at {selectedTime}. We sent you an email, and you will get another one when they answer.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink to="/account/reservations">My reservations</ButtonLink>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  } else {
    body = (
      <CustomerOnly action="book" returnQuery={`?book=${service.id}`}>
        <div className="space-y-6">
          <DayPicker business={business} selected={date} onSelect={(day) => { setDate(day); setStartsAt(null); setError(null); }} />
          {date && <TimePicker business={business} service={service} date={date} selected={startsAt} onSelect={setStartsAt} reloadKey={reloadKey} />}
          {startsAt && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">3. Anything the business should know?</h3>
              <TextAreaField label="Notes (optional)" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} error={fieldErrors.notes} />
              <TextField label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} autoComplete="tel" />
            </div>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              {startsAt && date ? <><span className="font-semibold text-slate-900">{longDate(date)}, {selectedTime}</span></> : 'Choose a day and a time.'}
            </p>
            <Button onClick={confirm} disabled={!startsAt} loading={sending}>Confirm booking</Button>
          </div>
          <p className="text-xs text-slate-500">Free cancellation online until {business.booking.cancellationNoticeHours} hours before the appointment.</p>
        </div>
      </CustomerOnly>
    );
  }

  return (
    <Dialog
      eyebrow={`Book at ${business.displayName}`}
      title={service.name}
      subtitle={`${formatDuration(service.durationMinutes)} · ${priceLabel(service.priceType, service.priceCents)}`}
      onClose={onClose}
    >
      {body}
    </Dialog>
  );
}
