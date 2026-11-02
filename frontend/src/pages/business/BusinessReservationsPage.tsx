import { Clock, Mail, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { businessApi } from '../../api/business.api';
import { errorMessage } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import type { BusinessReservation } from '../../types/api';
import { formatInZone, timeInZone } from '../../utils/dates';
import { formatDuration, priceLabel } from '../../utils/format';

type Tab = 'pending' | 'upcoming' | 'past' | 'all';
type Action = 'confirm' | 'reject' | 'cancel' | 'complete';
const TABS: TabItem<Tab>[] = [
  { value: 'pending', label: 'Needs your answer' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

function ReservationRow({ reservation, onChanged }: { reservation: BusinessReservation; onChanged: () => void }) {
  const r = reservation;
  const [asking, setAsking] = useState<'reject' | 'cancel' | null>(null); // actions that can carry a message
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      await businessApi.reservationAction(r.id, action, action === 'reject' || action === 'cancel' ? message : undefined);
      setAsking(null);
      setMessage('');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="w-28 shrink-0">
          <p className="text-2xl font-bold text-slate-900">{timeInZone(r.startsAt, r.timezone)}</p>
          <p className="text-xs text-slate-500">{formatInZone(r.startsAt, r.timezone).replace(/, \d{2}:\d{2}$/, '')}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{r.service.name}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Clock className="h-4 w-4" aria-hidden /> {formatDuration(r.service.durationMinutes)} · {priceLabel(r.service.priceType, r.service.priceCents)}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4 text-slate-400" aria-hidden /> {r.customer.name}</span>
            <a href={`mailto:${r.customer.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-4 w-4 text-slate-400" aria-hidden /> {r.customer.email}</a>
            {r.customer.phone && <a href={`tel:${r.customer.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-4 w-4 text-slate-400" aria-hidden /> {r.customer.phone}</a>}
            {r.customer.previousVisits > 0 ? <Badge color="green">{r.customer.previousVisits} earlier visit{r.customer.previousVisits > 1 ? 's' : ''}</Badge> : <Badge>New customer</Badge>}
          </div>
          {r.customerNotes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">Notes:</span> {r.customerNotes}</p>}
          {r.businessMessage && <p className="mt-2 text-sm text-slate-500">Your message: {r.businessMessage}</p>}
          {r.status === 'cancelled' && r.cancelledBy && <p className="mt-2 text-sm text-slate-500">Cancelled by {r.cancelledBy === 'system' ? 'the system (no answer in time)' : `the ${r.cancelledBy}`}.</p>}
        </div>
        {!asking && (
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {r.status === 'pending' && <Button loading={busy === 'confirm'} onClick={() => run('confirm')}>Confirm</Button>}
            {r.status === 'pending' && <Button variant="secondary" onClick={() => setAsking('reject')}>Reject</Button>}
            {r.status === 'confirmed' && r.canComplete && <Button loading={busy === 'complete'} onClick={() => run('complete')}>Mark as completed</Button>}
            {r.status === 'confirmed' && <Button variant="ghost" onClick={() => setAsking('cancel')}>Cancel</Button>}
          </div>
        )}
      </div>
      {asking && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
          <TextField
            label={`Message to ${r.customer.name} (optional, included in the email)`}
            value={message}
            maxLength={1000}
            placeholder={asking === 'reject' ? 'e.g. Fully booked that morning, could you try Wednesday?' : 'e.g. Sorry, we are closed because of illness.'}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="danger" loading={busy === asking} onClick={() => run(asking)}>{asking === 'reject' ? 'Reject request' : 'Cancel appointment'}</Button>
            <Button variant="secondary" onClick={() => setAsking(null)}>Back</Button>
          </div>
        </div>
      )}
      {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
    </li>
  );
}

export function BusinessReservationsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'upcoming';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useApi(`business-reservations/${tab}/${page}`, () => businessApi.reservations(tab, page));

  return (
    <>
      <PageHeader title="Reservations" description="Confirm new requests and manage your appointments. Customers are emailed automatically." />
      <Tabs tabs={TABS} active={tab} onChange={(value) => setParams({ tab: value })} />
      {list.loading && !list.data && <Spinner />}
      {list.error && <Alert tone="error">{list.error}</Alert>}
      {list.data && list.data.data.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          {tab === 'pending' ? 'No requests waiting for an answer.' : 'No reservations here yet.'}
        </p>
      )}
      {list.data && list.data.data.length > 0 && (
        <ul className="space-y-4">
          {list.data.data.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} onChanged={list.reload} />)}
        </ul>
      )}
      {list.data && <Pagination page={page} total={list.data.meta.total} pageSize={list.data.meta.pageSize} onChange={(p) => setParams({ tab, page: String(p) })} />}
    </>
  );
}
