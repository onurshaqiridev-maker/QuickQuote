import { CalendarDays, Mail, Phone, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../../api/client';
import { customerApi } from '../../api/customer.api';
import type { CustomerQuote, QuoteDecision } from '../../types/api';
import { longDate } from '../../utils/dates';
import { formatDateTime, formatPrice } from '../../utils/format';
import { BusinessLogo } from '../business/BusinessCard';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { DecisionBadge, QuoteStatusBadge } from './QuoteStatusBadge';

/** One quote request in "My quote requests": the request, the business's answer, and accept / decline. */
export function CustomerQuoteCard({ quote, onChanged }: { quote: CustomerQuote; onChanged?: () => void }) {
  const q = quote;
  const [asking, setAsking] = useState<QuoteDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: QuoteDecision) => {
    setBusy(true);
    setError(null);
    try {
      await customerApi.decideQuote(q.id, decision);
      setAsking(null);
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const answered = q.status === 'completed' || q.status === 'rejected';

  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <BusinessLogo name={q.business.displayName} logoUrl={q.business.logoUrl} size="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/businesses/${q.business.slug}`} className="font-semibold text-slate-900 hover:text-brand-700">{q.business.displayName}</Link>
            <QuoteStatusBadge status={q.status} viewer="customer" />
            {q.customerDecision && <DecisionBadge decision={q.customerDecision} viewer="customer" />}
          </div>
          <p className="mt-1 font-medium text-slate-800">{q.subject}</p>
          <p className="text-sm text-slate-500">{q.service ? q.service.name : 'General request'} · sent {formatDateTime(q.createdAt)}</p>

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-brand-700">Your request</summary>
            <p className="mt-2 whitespace-pre-line text-slate-700">{q.description}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
              {q.preferredDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden /> {longDate(q.preferredDate)}</span>}
              {q.budgetCents !== null && <span className="inline-flex items-center gap-1"><Wallet className="h-4 w-4" aria-hidden /> Budget {formatPrice(q.budgetCents)}</span>}
            </p>
          </details>

          {q.status === 'pending' && <p className="mt-3 text-sm text-amber-700">Waiting for {q.business.displayName} to answer.</p>}
          {q.status === 'processing' && <p className="mt-3 text-sm text-brand-700">{q.business.displayName} is preparing your quote.</p>}

          {answered && (
            <div className={`mt-3 rounded-xl p-4 text-sm ${q.status === 'completed' ? 'bg-green-50' : 'bg-slate-50'}`}>
              {q.status === 'completed' && (
                <p className="font-semibold text-slate-900">
                  {q.quotedPriceCents !== null ? <>Quoted price: <span className="text-lg">{formatPrice(q.quotedPriceCents)}</span></> : 'No fixed price yet, see the message.'}
                </p>
              )}
              {q.businessMessage && <p className="mt-1 whitespace-pre-line text-slate-700"><span className="font-semibold">Message:</span> {q.businessMessage}</p>}
              {q.customerDecision === 'accepted' && (
                <div className="mt-3 border-t border-green-100 pt-3 text-slate-700">
                  <p>{q.business.displayName} will contact you to plan the next steps. You can also reach them directly:</p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {q.business.phone && <a href={`tel:${q.business.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-medium hover:underline"><Phone className="h-4 w-4" aria-hidden /> {q.business.phone}</a>}
                    {q.business.email && <a href={`mailto:${q.business.email}`} className="inline-flex items-center gap-1 font-medium hover:underline"><Mail className="h-4 w-4" aria-hidden /> {q.business.email}</a>}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        {q.canDecide && !asking && (
          <div className="flex flex-wrap gap-2 sm:flex-col">
            <Button onClick={() => setAsking('accepted')}>Accept quote</Button>
            <Button variant="secondary" onClick={() => setAsking('declined')}>Decline</Button>
          </div>
        )}
      </div>
      {asking && (
        <div className={`mt-4 space-y-3 rounded-xl p-4 ${asking === 'accepted' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-sm font-medium text-slate-800">
            {asking === 'accepted'
              ? `Accept this quote? ${q.business.displayName} will be told and will contact you.`
              : `Decline this quote? ${q.business.displayName} will be told.`}
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-2">
            <Button variant={asking === 'accepted' ? 'primary' : 'danger'} loading={busy} onClick={() => decide(asking)}>
              {asking === 'accepted' ? 'Yes, accept' : 'Yes, decline'}
            </Button>
            <Button variant="secondary" onClick={() => setAsking(null)}>Back</Button>
          </div>
        </div>
      )}
    </li>
  );
}
