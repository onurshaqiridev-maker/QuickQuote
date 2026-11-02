import { CalendarX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { customerApi } from '../../api/customer.api';
import { CustomerReservationCard } from '../../components/reservations/CustomerReservationCard';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';

type Tab = 'upcoming' | 'past' | 'cancelled';
const TABS: { value: Tab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled and declined' },
];

export function MyReservationsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'upcoming') as Tab;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useApi(`my-reservations/${tab}/${page}`, () => customerApi.reservations(tab, page));
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.meta.total / list.data.meta.pageSize)) : 1;

  return (
    <>
      <PageHeader title="My reservations" description="Your appointments and their status." action={<ButtonLink to="/explore">Book something new</ButtonLink>} />
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t.value} type="button" onClick={() => setParams({ tab: t.value })} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.value ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {list.loading && !list.data && <Spinner />}
      {list.error && <Alert tone="error">{list.error}</Alert>}
      {list.data && list.data.data.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <CalendarX className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm text-slate-600">{tab === 'upcoming' ? 'No upcoming appointments.' : 'Nothing here yet.'}</p>
          {tab === 'upcoming' && <ButtonLink to="/explore" className="mt-5">Find a business</ButtonLink>}
        </div>
      )}
      {list.data && list.data.data.length > 0 && (
        <ul className="space-y-4">
          {list.data.data.map((reservation) => <CustomerReservationCard key={reservation.id} reservation={reservation} onChanged={list.reload} />)}
        </ul>
      )}
      {list.data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ tab, page: String(page - 1) })}>Previous</Button>
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setParams({ tab, page: String(page + 1) })}>Next</Button>
        </div>
      )}
    </>
  );
}
