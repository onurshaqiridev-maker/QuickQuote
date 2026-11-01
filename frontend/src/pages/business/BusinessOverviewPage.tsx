import { Link } from 'react-router';
import { businessApi } from '../../api/business.api';
import { GoLiveChecklist } from '../../components/business/GoLiveChecklist';
import { UsageMeter } from '../../components/business/UsageMeter';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';

export function BusinessOverviewPage() {
  const { data: overview, loading, error } = useApi('business-overview', () => businessApi.overview());

  if (loading && !overview) return <FullPageSpinner />;
  if (error || !overview) return <Alert tone="error">{error ?? 'Could not load your business.'}</Alert>;

  const { business, usage } = overview;
  return (
    <>
      <PageHeader
        title={business.displayName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={business.status} />
            {overview.isVisible ? <Badge color="green">Visible to customers</Badge> : <Badge>Not visible yet</Badge>}
            <span className="text-sm">
              Public address: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/businesses/{business.slug}</code>
            </span>
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <GoLiveChecklist items={overview.checklist} />
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Your plan</h2>
            <p className="mt-1 text-sm text-slate-600">
              {usage.planName ? (
                <>{usage.planName} plan</>
              ) : (
                <>No plan yet: the Starter limits apply while you prepare. <Link to="/pricing" className="font-semibold text-brand-700 hover:underline">Compare plans</Link></>
              )}
            </p>
            <div className="mt-4 space-y-4">
              <UsageMeter label="Services" used={usage.services.used} limit={usage.services.limit} />
              <UsageMeter label="Photos" used={usage.photos.used} limit={usage.photos.limit} />
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">Today</h2>
            <p className="mt-2 text-sm text-slate-600">No appointments yet. Reservations arrive in phase 8.</p>
          </Card>
          <Card>
            <h2 className="font-semibold">New quote requests</h2>
            <p className="mt-2 text-sm text-slate-600">None yet. Quote requests arrive in phase 9.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
