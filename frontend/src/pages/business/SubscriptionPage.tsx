import { businessApi } from '../../api/business.api';
import { UsageMeter } from '../../components/business/UsageMeter';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Card, CardTitle } from '../../components/ui/Card';
import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';

export function SubscriptionPage() {
  const { data: overview, error } = useApi('business-overview', () => businessApi.overview());

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!overview) return <FullPageSpinner />;

  // Free launch: no payments yet. Show what the business has, and what will happen later.
  if (!overview.subscriptionsRequired) {
    return (
      <>
        <PageHeader title="Subscription" description="Your Quick Quote listing and its limits." />
        <Card>
          <CardTitle action={<Badge color="green">Free</Badge>}>Free during our launch</CardTitle>
          <p className="text-sm text-slate-600">
            Listing your business on Quick Quote is free while we launch. You do not need to choose a plan or pay
            anything to publish your profile and receive customers.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <UsageMeter label="Active services" used={overview.usage.services.used} limit={overview.usage.services.limit} />
            <UsageMeter label="Photos" used={overview.usage.photos.used} limit={overview.usage.photos.limit} />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">What happens later?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Paid monthly plans with more services, more photos and a featured listing will be introduced after the
            launch. We will email you well before anything changes, and nothing will be charged without your choice.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Subscription" description="Your plan, payments and renewal." />
      <ComingSoon phase={6} title="Subscription" features={['Choose Starter, Professional or Premium', 'Mock checkout and bank transfer payments', 'Expiration date and renewal', 'Change plan, cancel or resume', 'Payment history']} />
    </>
  );
}
