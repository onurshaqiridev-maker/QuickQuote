import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { adminApi } from '../../api/admin.api';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { BusinessStatus } from '../../types/api';
import { formatDateTime } from '../../utils/format';

const TABS: { label: string; value?: BusinessStatus }[] = [
  { label: 'All' },
  { label: 'Waiting for review', value: 'pending_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Deactivated', value: 'deactivated' },
];

export function ManageBusinessesPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as BusinessStatus | null) ?? undefined;
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [searchText, setSearchText] = useState(search);
  const list = useApi(`admin-businesses/${status}/${search}/${page}`, () => adminApi.businesses({ status, search, page }));

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ search: searchText.trim() });
  };

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.meta.total / list.data.meta.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Businesses" description="Review new businesses and manage their status." />
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => update({ status: tab.value })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === tab.value ? 'bg-white shadow-sm' : 'text-slate-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="relative" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              aria-label="Search businesses"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Business, owner or email"
              className="w-full rounded-lg border-0 py-2 pr-3 pl-9 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none lg:w-72"
            />
          </form>
        </div>

        {list.loading && !list.data && <Spinner />}
        {list.error && <Alert tone="error">{list.error}</Alert>}
        {list.data && list.data.data.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No businesses here.</p>}
        {list.data && list.data.data.length > 0 && (
          <div className="-mx-6 overflow-x-auto">
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
        {list.data && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</Button>
            <span className="text-slate-500">Page {page} of {totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>Next</Button>
          </div>
        )}
      </Card>
    </>
  );
}
