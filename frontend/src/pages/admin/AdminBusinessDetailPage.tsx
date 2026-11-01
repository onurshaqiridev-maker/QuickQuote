import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { adminApi, type BusinessAction } from '../../api/admin.api';
import { ApiError, assetUrl, errorMessage } from '../../api/client';
import { BusinessLogo } from '../../components/business/BusinessCard';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { TextAreaField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { AdminBusinessDetail, BusinessStatus } from '../../types/api';
import { formatDateTime } from '../../utils/format';

/** Which actions make sense for each status (the backend checks this again). */
const ACTIONS: Record<BusinessStatus, BusinessAction[]> = {
  pending_review: ['approve', 'suspend', 'deactivate'],
  approved: ['suspend', 'deactivate'],
  suspended: ['approve', 'deactivate'],
  deactivated: ['reactivate'],
};

const LABELS: Record<BusinessAction, string> = {
  approve: 'Approve',
  suspend: 'Suspend',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
};

const NEEDS_REASON: BusinessAction[] = ['suspend', 'deactivate'];

function ActionsCard({ business, onChanged }: { business: AdminBusinessDetail; onChanged: (b: AdminBusinessDetail) => void }) {
  const [pending, setPending] = useState<BusinessAction | null>(null); // an action waiting for its reason
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const run = async (action: BusinessAction) => {
    if (NEEDS_REASON.includes(action) && pending !== action) {
      setPending(action);
      setNotice(null);
      return;
    }
    setBusy(true);
    setReasonError(undefined);
    setNotice(null);
    try {
      const updated = await adminApi.changeBusinessStatus(business.id, action, NEEDS_REASON.includes(action) ? reason : undefined);
      onChanged(updated);
      setPending(null);
      setReason('');
      setNotice({ tone: 'success', text: `Done: the business is now "${updated.status.replace('_', ' ')}". The owner was emailed.` });
    } catch (error) {
      if (error instanceof ApiError) setReasonError(error.fieldErrors().reason);
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle>Decision</CardTitle>
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      {business.statusReason && (
        <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">Reason given:</span> {business.statusReason}
        </p>
      )}
      {pending && (
        <div className="mb-4 space-y-3">
          <TextAreaField
            label={`Why do you want to ${pending} this business? (sent to the owner)`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError}
          />
          <div className="flex gap-2">
            <Button variant="danger" loading={busy} onClick={() => run(pending)}>Confirm {LABELS[pending].toLowerCase()}</Button>
            <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {!pending && (
        <div className="flex flex-wrap gap-2">
          {ACTIONS[business.status].map((action) => (
            <Button
              key={action}
              variant={action === 'approve' || action === 'reactivate' ? 'primary' : 'secondary'}
              loading={busy}
              onClick={() => run(action)}
            >
              {LABELS[action]}
            </Button>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Customers see a business only when it is approved and published. Suspending or deactivating hides it immediately.
      </p>
    </Card>
  );
}

function Details({ initial }: { initial: AdminBusinessDetail }) {
  const [business, setBusiness] = useState(initial);
  const { profile, owner } = business;
  const visible = business.status === 'approved' && profile.isPublished;

  return (
    <>
      <PageHeader
        title={profile.displayName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={business.status} />
            {profile.isPublished ? <Badge color="blue">published</Badge> : <Badge>not published</Badge>}
            <span className="text-sm">Registered {formatDateTime(business.createdAt)}</span>
          </span>
        }
        action={visible ? <ButtonLink to={`/businesses/${profile.slug}`} variant="secondary">View public page</ButtonLink> : undefined}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="flex gap-4">
              <BusinessLogo name={profile.displayName} logoUrl={profile.logoUrl} size="h-16 w-16" />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">
                  {[profile.addressLine, profile.postalCode, profile.city, profile.country].filter(Boolean).join(', ') || 'No address'}
                </p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {profile.categories.map((c) => <Badge key={c.id}>{c.name}</Badge>)}
                </p>
              </div>
            </div>
            <h3 className="mt-5 text-sm font-semibold text-slate-900">Description</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{profile.description || 'No description yet.'}</p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-slate-500">Public email</dt><dd>{profile.contactEmail ?? '–'}</dd></div>
              <div><dt className="text-slate-500">Public phone</dt><dd>{profile.contactPhone ?? '–'}</dd></div>
              <div><dt className="text-slate-500">Website</dt><dd className="break-all">{profile.websiteUrl ?? '–'}</dd></div>
            </dl>
            {profile.photos.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {profile.photos.slice(0, 6).map((photo) => (
                  <img key={photo.id} src={assetUrl(photo.imageUrl) ?? ''} alt={photo.caption ?? ''} className="aspect-[4/3] w-full rounded-lg object-cover" />
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardTitle>Checklist</CardTitle>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {business.checklist.map((item) => (
                <li key={item.key} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-green-100 text-green-700' : 'border-2 border-slate-200'}`} aria-hidden>
                    {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className={item.done ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">Active services: {business.activeServices}</p>
          </Card>
        </div>
        <div className="space-y-6">
          <ActionsCard business={business} onChanged={setBusiness} />
          <Card>
            <CardTitle>Owner</CardTitle>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-slate-500">Name</dt><dd>{owner.fullName}</dd></div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="break-all">{owner.email} {owner.emailVerified ? <Badge color="green">confirmed</Badge> : <Badge color="amber">not confirmed</Badge>}</dd>
              </div>
              <div><dt className="text-slate-500">Phone</dt><dd>{owner.phone ?? '–'}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

export function AdminBusinessDetailPage() {
  const { id = '' } = useParams();
  const { data, error } = useApi(`admin-business/${id}`, () => adminApi.business(id));
  return (
    <>
      <Link to="/admin/businesses" className="text-sm font-medium text-brand-700 hover:underline">Back to all businesses</Link>
      {error && <Alert tone="error">{error}</Alert>}
      {data ? <Details key={data.id} initial={data} /> : !error && <FullPageSpinner />}
    </>
  );
}
