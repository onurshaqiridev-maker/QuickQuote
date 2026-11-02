import { FileQuestion } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { customerApi } from '../../api/customer.api';
import { CustomerQuoteCard } from '../../components/quotes/CustomerQuoteCard';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import type { CustomerQuoteTab } from '../../types/api';

const TABS: TabItem<CustomerQuoteTab>[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Waiting for an answer' },
  { value: 'answered', label: 'Quotes received' },
  { value: 'declined', label: 'Declined' },
];

export function MyQuoteRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useApi(`my-quotes/${tab}/${page}`, () => customerApi.quotes(tab, page));

  return (
    <>
      <PageHeader title="My quote requests" description="Everything you asked businesses for, and their answers." action={<ButtonLink to="/explore">Find a business</ButtonLink>} />
      <Tabs tabs={TABS} active={tab} onChange={(value) => setParams({ tab: value })} />
      {list.loading && !list.data && <Spinner />}
      {list.error && <Alert tone="error">{list.error}</Alert>}
      {list.data && list.data.data.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <FileQuestion className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm text-slate-600">
            {tab === 'all' ? 'You have not asked for a quote yet. Open a business page and click "Request a quote".' : 'Nothing here yet.'}
          </p>
          {tab === 'all' && <ButtonLink to="/explore" className="mt-5">Find a business</ButtonLink>}
        </div>
      )}
      {list.data && list.data.data.length > 0 && (
        <ul className="space-y-4">
          {list.data.data.map((quote) => <CustomerQuoteCard key={quote.id} quote={quote} onChanged={list.reload} />)}
        </ul>
      )}
      {list.data && <Pagination page={page} total={list.data.meta.total} pageSize={list.data.meta.pageSize} onChange={(p) => setParams({ tab, page: String(p) })} />}
    </>
  );
}
