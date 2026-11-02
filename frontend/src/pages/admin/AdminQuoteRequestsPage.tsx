import { useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api';
import { DecisionBadge, QuoteStatusBadge } from '../../components/quotes/QuoteStatusBadge';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBox } from '../../components/ui/SearchBox';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import { useListParams } from '../../hooks/useListParams';
import type { AdminQuote, QuoteStatus } from '../../types/api';
import { longDate } from '../../utils/dates';
import { formatDateTime, formatPrice } from '../../utils/format';

const TABS: TabItem<QuoteStatus | 'all'>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'New' },
  { value: 'processing', label: 'In progress' },
  { value: 'completed', label: 'Answered' },
  { value: 'rejected', label: 'Declined' },
];

function QuoteRow({ quote: q }: { quote: AdminQuote }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="align-top">
        <td className="px-6 py-3">
          <p className="font-medium text-slate-900">{q.subject}</p>
          <p className="text-xs text-slate-500">{q.service ? q.service.name : 'General request'}</p>
        </td>
        <td className="px-3 py-3"><Link to={`/admin/businesses/${q.business.id}`} className="font-medium text-brand-700 hover:underline">{q.business.displayName}</Link></td>
        <td className="px-3 py-3">
          <p>{q.customer.name}</p>
          <p className="text-xs text-slate-500">{q.customer.email}</p>
        </td>
        <td className="px-3 py-3 whitespace-nowrap text-slate-500">{formatDateTime(q.createdAt)}</td>
        <td className="px-3 py-3">
          <div className="flex flex-col items-start gap-1">
            <QuoteStatusBadge status={q.status} viewer="business" />
            {q.customerDecision && <DecisionBadge decision={q.customerDecision} viewer="business" />}
          </div>
        </td>
        <td className="px-6 py-3 text-right">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="font-semibold text-brand-700 hover:underline">{open ? 'Close' : 'Details'}</button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="space-y-2 bg-slate-50 px-6 py-4 text-sm text-slate-700">
            <p className="whitespace-pre-line">{q.description}</p>
            <p className="text-slate-500">
              {[q.preferredDate && `Preferred date: ${longDate(q.preferredDate)}`, q.budgetCents !== null && `Budget: ${formatPrice(q.budgetCents)}`].filter(Boolean).join(' · ') || 'No date or budget given.'}
            </p>
            {q.status === 'completed' && (
              <p><span className="font-semibold">Answer:</span> {q.quotedPriceCents !== null ? formatPrice(q.quotedPriceCents) : 'no fixed price'}{q.businessMessage && ` - ${q.businessMessage}`}</p>
            )}
            {q.status === 'rejected' && q.businessMessage && <p><span className="font-semibold">Reason:</span> {q.businessMessage}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminQuoteRequestsPage() {
  const { get, page, update } = useListParams();
  const status = (get('status') || 'all') as QuoteStatus | 'all';
  const search = get('search');
  const list = useApi(`admin-quotes/${status}/${search}/${page}`, () =>
    adminApi.quotes({ status: status === 'all' ? undefined : status, search, page }),
  );

  return (
    <>
      <PageHeader title="Quote requests" description="Every quote request on the platform (read-only)." />
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs tabs={TABS} active={status} onChange={(value) => update({ status: value === 'all' ? undefined : value })} />
          <SearchBox label="Search quote requests" placeholder="Business, customer or subject" initial={search} onSearch={(text) => update({ search: text })} />
        </div>
        {list.loading && !list.data && <Spinner />}
        {list.error && <Alert tone="error">{list.error}</Alert>}
        {list.data && list.data.data.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No quote requests found.</p>}
        {list.data && list.data.data.length > 0 && (
          <div className={`-mx-6 overflow-x-auto transition-opacity ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-3 py-3">Business</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Sent</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.data.map((quote) => <QuoteRow key={quote.id} quote={quote} />)}
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
