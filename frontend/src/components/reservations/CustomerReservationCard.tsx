import { Clock, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../../api/client';
import { customerApi } from '../../api/customer.api';
import type { CustomerReservation } from '../../types/api';
import { formatInZone } from '../../utils/dates';
import { formatDuration, priceLabel } from '../../utils/format';
import { BusinessLogo } from '../business/BusinessCard';
import { Alert } from '../ui/Alert';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TextField } from '../ui/FormField';

/** One reservation in "My reservations", with the cancel action when it is still allowed. */
export function CustomerReservationCard({ reservation, onChanged }: { reservation: CustomerReservation; onChanged?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const r = reservation;
  const isActive = r.status === 'pending' || r.status === 'confirmed';

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await customerApi.cancel(r.id, reason);
      setConfirming(false);
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <BusinessLogo name={r.business.displayName} logoUrl={r.business.logoUrl} size="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/businesses/${r.business.slug}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.business.displayName}</Link>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-1 text-sm text-slate-700">{r.service.name} · {priceLabel(r.service.priceType, r.service.priceCents)}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden /> {formatInZone(r.startsAt, r.timezone)} ({formatDuration(r.service.durationMinutes)})</span>
            {(r.business.addressLine || r.business.city) && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {[r.business.addressLine, r.business.city].filter(Boolean).join(', ')}</span>
            )}
          </p>
          {r.status === 'pending' && <p className="mt-2 text-sm text-amber-700">Waiting for {r.business.displayName} to confirm.</p>}
          {r.businessMessage && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">Message:</span> {r.businessMessage}</p>}
          {r.status === 'cancelled' && r.cancelledBy === 'customer' && <p className="mt-2 text-sm text-slate-500">You cancelled this appointment.</p>}
        </div>
        {isActive && !confirming && (
          r.canCancel ? (
            <Button variant="secondary" onClick={() => setConfirming(true)}>Cancel</Button>
          ) : (
            <p className="max-w-[14rem] text-xs text-slate-500">
              Too late to cancel online. Please call {r.business.phone ?? 'the business'}.
            </p>
          )
        )}
      </div>
      {confirming && (
        <div className="mt-4 space-y-3 rounded-xl bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Cancel this appointment? The business will be told.</p>
          <TextField label="Reason (optional)" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-2">
            <Button variant="danger" loading={busy} onClick={cancel}>Yes, cancel</Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>Keep it</Button>
          </div>
        </div>
      )}
    </li>
  );
}
