import { CalendarDays, Mail, Phone, UserRound, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { businessApi } from '../../api/business.api';
import { ApiError, errorMessage } from '../../api/client';
import { DecisionBadge, QuoteStatusBadge } from '../../components/quotes/QuoteStatusBadge';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import type { BusinessQuote, BusinessQuoteTab } from '../../types/api';
import { longDate } from '../../utils/dates';
import { formatDateTime, formatPrice, parsePriceToCents } from '../../utils/format';

const TABS: TabItem<BusinessQuoteTab>[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'answered', label: 'Answered' },
  { value: 'declined', label: 'Declined' },
];

const EMPTY_TEXT: Record<BusinessQuoteTab, string> = {
  new: 'No new quote requests.',
  in_progress: 'Nothing in progress. Click "Start working on it" on a new request to move it here.',
  answered: 'No answered requests yet.',
  declined: 'No declined requests.',
};

function QuoteRow({ quote, onChanged }: { quote: BusinessQuote; onChanged: () => void }) {
  const q = quote;
  const [mode, setMode] = useState<'respond' | 'reject' | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const open = q.status === 'pending' || q.status === 'processing';

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await action();
      setMode(null);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
    } finally {
      setBusy(false);
    }
  };

  const sendQuote = (event: FormEvent) => {
    event.preventDefault();
    const quotedPriceCents = price.trim() ? parsePriceToCents(price) : null;
    if (price.trim() && quotedPriceCents === null) {
      setFieldErrors({ quotedPriceCents: 'Enter an amount like 250 or 249.50.' });
      return;
    }
    void run(() => businessApi.respondToQuote(q.id, { message, quotedPriceCents }));
  };

  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{q.subject}</p>
            <QuoteStatusBadge status={q.status} viewer="business" />
            {q.customerDecision && <DecisionBadge decision={q.customerDecision} viewer="business" />}
          </div>
          <p className="text-sm text-slate-500">{q.service ? q.service.name : 'General request'} · received {formatDateTime(q.createdAt)}</p>
          <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{q.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
            {q.preferredDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden /> Preferred: {longDate(q.preferredDate)}</span>}
            {q.budgetCents !== null && <span className="inline-flex items-center gap-1"><Wallet className="h-4 w-4 text-slate-400" aria-hidden /> Budget: {formatPrice(q.budgetCents)}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4 text-slate-400" aria-hidden /> {q.customer.name}</span>
            <a href={`mailto:${q.customer.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-4 w-4 text-slate-400" aria-hidden /> {q.customer.email}</a>
            {q.customer.phone && <a href={`tel:${q.customer.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-4 w-4 text-slate-400" aria-hidden /> {q.customer.phone}</a>}
          </div>
          {q.status === 'completed' && (
            <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Your quote: {q.quotedPriceCents !== null ? formatPrice(q.quotedPriceCents) : 'no fixed price'}</p>
              {q.businessMessage && <p className="mt-1 whitespace-pre-line">{q.businessMessage}</p>}
              {!q.customerDecision && <p className="mt-2 text-xs text-slate-500">Waiting for the customer to accept or decline.</p>}
            </div>
          )}
          {q.status === 'rejected' && q.businessMessage && <p className="mt-3 text-sm text-slate-500">Your message: {q.businessMessage}</p>}
        </div>
        {open && !mode && (
          <div className="flex flex-wrap gap-2 lg:flex-col">
            <Button onClick={() => setMode('respond')}>Send quote</Button>
            {q.status === 'pending' && <Button variant="secondary" loading={busy} onClick={() => run(() => businessApi.startQuote(q.id))}>Start working on it</Button>}
            <Button variant="ghost" onClick={() => setMode('reject')}>Decline</Button>
          </div>
        )}
      </div>

      {mode === 'respond' && (
        <form onSubmit={sendQuote} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4" noValidate>
          <TextField
            label="Price in EUR (optional)"
            inputMode="decimal"
            placeholder="e.g. 220"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            error={fieldErrors.quotedPriceCents}
            hint="Leave empty if the price depends on a visit or more information."
          />
          <TextAreaField
            label={`Message to ${q.customer.name}`}
            required
            rows={4}
            maxLength={3000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            error={fieldErrors.message}
            placeholder="What is included, how long it takes, when you could start..."
          />
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>Send quote</Button>
            <Button variant="secondary" onClick={() => setMode(null)}>Back</Button>
          </div>
        </form>
      )}
      {mode === 'reject' && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
          <TextField
            label={`Message to ${q.customer.name} (optional, included in the email)`}
            maxLength={3000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Sorry, we are fully booked until August."
          />
          <div className="flex gap-2">
            <Button variant="danger" loading={busy} onClick={() => run(() => businessApi.rejectQuote(q.id, message))}>Decline request</Button>
            <Button variant="secondary" onClick={() => setMode(null)}>Back</Button>
          </div>
        </div>
      )}
      {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
    </li>
  );
}

export function BusinessQuoteRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'new';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useApi(`business-quotes/${tab}/${page}`, () => businessApi.quotes(tab, page));

  return (
    <>
      <PageHeader title="Quote requests" description="Answer customers who asked for a price. They are emailed every time you change something." />
      <Tabs tabs={TABS} active={tab} onChange={(value) => setParams({ tab: value })} />
      {list.loading && !list.data && <Spinner />}
      {list.error && <Alert tone="error">{list.error}</Alert>}
      {list.data && list.data.data.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">{EMPTY_TEXT[tab]}</p>
      )}
      {list.data && list.data.data.length > 0 && (
        <ul className="space-y-4">
          {list.data.data.map((quote) => <QuoteRow key={quote.id} quote={quote} onChanged={list.reload} />)}
        </ul>
      )}
      {list.data && <Pagination page={page} total={list.data.meta.total} pageSize={list.data.meta.pageSize} onChange={(p) => setParams({ tab, page: String(p) })} />}
    </>
  );
}
