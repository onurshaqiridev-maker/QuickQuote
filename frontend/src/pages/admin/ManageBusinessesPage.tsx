import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBox } from '../../components/ui/SearchBox';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import { useListParams } from '../../hooks/useListParams';
import type { BusinessStatus } from '../../types/api';
import { formatDateTime } from '../../utils/format';

const TABS: TabItem<BusinessStatus | 'all'>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Waiting for review' },
  { value: 'approved', label: 'Approved' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
];

export function ManageBusinessesPage() {
  const { get, page, update } = useListParams();
  const status = (get('status') || 'all') as BusinessStatus | 'all';
  const search = get('search');
  const list = useApi(`admin-businesses/${status}/${search}/${page}`, () =>
    adminApi.businesses({ status: status === 'all' ? undefined : status, search, page }),
  );

  return (
    <>
      <PageHeader title="Businesses" description="Review new businesses and manage their status." />
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs tabs={TABS} active={status} onChange={(value) => update({ status: value === 'all' ? undefined : value })} />
          <SearchBox label="Search businesses" placeholder="Business, owner or email" initial={search} onSearch={(text) => update({ search: text })} />
        </div>

        {list.loading && !list.data && <Spinner />}
        {list.error && <Alert tone="error">{list.error}</Alert>}
        {list.data && list.data.data.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No businesses here.</p>}
        {list.data && list.data.data.length > 0 && (
          <div className={`-mx-6 overflow-x-auto transition-opacity ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Business</th>
                  <th className="px-3 py-3">Owner</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Services</th>
                  <th className="px-3 py-3">Registered</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.data.map((business) => (
                  <tr key={business.id} className="align-top">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{business.displayName}</p>
                      <p className="text-xs text-slate-500">{business.city ?? 'No city'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{business.owner.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {business.owner.email} {!business.owner.emailVerified && <span className="text-amber-700">(not confirmed)</span>}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={business.status} />
                        {business.isPublished ? <Badge color="blue">published</Badge> : <Badge>not published</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">{business.activeServices}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">{formatDateTime(business.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      <Link to={`/admin/businesses/${business.id}`} className="font-semibold text-brand-700 hover:underline">
                        {business.status === 'pending_review' ? 'Review' : 'Open'}
                      </Link>
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
