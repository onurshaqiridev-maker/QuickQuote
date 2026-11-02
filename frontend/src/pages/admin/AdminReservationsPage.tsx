import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api';
import { Alert } from '../../components/ui/Alert';
import { StatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBox } from '../../components/ui/SearchBox';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import { useListParams } from '../../hooks/useListParams';
import { formatInZone } from '../../utils/dates';

const FILTER_INPUT = 'rounded-lg border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600';

export function AdminReservationsPage() {
  const { get, page, update } = useListParams();
  const filter = { status: get('status'), search: get('search'), from: get('from'), to: get('to') };
  const list = useApi(`admin-reservations/${JSON.stringify(filter)}/${page}`, () => adminApi.reservations({ ...filter, page }));

  return (
    <>
      <PageHeader title="Reservations" description="Every booking on the platform (read-only). Businesses and customers manage their own." />
      <Card>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="text-xs font-medium text-slate-600">
            Status
            <select aria-label="Status" value={filter.status} onChange={(e) => update({ status: e.target.value })} className={`mt-1 block w-full lg:w-40 ${FILTER_INPUT}`}>
              <option value="">Any status</option>
              {['pending', 'confirmed', 'completed', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            From
            <input type="date" value={filter.from} onChange={(e) => update({ from: e.target.value })} className={`mt-1 block w-full ${FILTER_INPUT}`} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            To
            <input type="date" value={filter.to} onChange={(e) => update({ to: e.target.value })} className={`mt-1 block w-full ${FILTER_INPUT}`} />
          </label>
          <div className="lg:ml-auto">
            <SearchBox label="Search reservations" placeholder="Business, customer or service" initial={filter.search} onSearch={(text) => update({ search: text })} />
          </div>
        </div>

        {list.loading && !list.data && <Spinner />}
        {list.error && <Alert tone="error">{list.error}</Alert>}
        {list.data && list.data.data.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No reservations found.</p>}
        {list.data && list.data.data.length > 0 && (
          <div className={`-mx-6 overflow-x-auto transition-opacity ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">When</th>
                  <th className="px-3 py-3">Business</th>
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.data.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-6 py-3 whitespace-nowrap">{formatInZone(r.startsAt, r.timezone)}</td>
                    <td className="px-3 py-3"><Link to={`/admin/businesses/${r.business.id}`} className="font-medium text-brand-700 hover:underline">{r.business.displayName}</Link></td>
                    <td className="px-3 py-3">{r.service.name}</td>
                    <td className="px-3 py-3">
                      <p>{r.customer.name}</p>
                      <p className="text-xs text-slate-500">{r.customer.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={r.status} />
                      {r.status === 'cancelled' && r.cancelledBy && <p className="mt-1 text-xs text-slate-500">by the {r.cancelledBy}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <div className="mt-4">
            <Pagination page={page} total={list.data.meta.total} pageSize={list.data.meta.pageSize} onChange={(p) => update({ page: String(p) })} />
          </div>
        )}
      </Card>
    </>
  );
}
