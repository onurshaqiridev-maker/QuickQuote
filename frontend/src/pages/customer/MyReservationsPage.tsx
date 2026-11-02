import { CalendarX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { customerApi } from '../../api/customer.api';
import { CustomerReservationCard } from '../../components/reservations/CustomerReservationCard';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';

type Tab = 'upcoming' | 'past' | 'cancelled';
const TABS: TabItem<Tab>[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled and declined' },
];

export function MyReservationsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'upcoming';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useApi(`my-reservations/${tab}/${page}`, () => customerApi.reservations(tab, page));

  return (
    <>
      <PageHeader title="My reservations" description="Your appointments and their status." action={<ButtonLink to="/explore">Book something new</ButtonLink>} />
      <Tabs tabs={TABS} active={tab} onChange={(value) => setParams({ tab: value })} />
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
      {list.data && <Pagination page={page} total={list.data.meta.total} pageSize={list.data.meta.pageSize} onChange={(p) => setParams({ tab, page: String(p) })} />}
    </>
  );
}
