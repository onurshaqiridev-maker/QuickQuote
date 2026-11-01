import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function SubscriptionPage() {
  return (
    <>
      <PageHeader title="Subscription" description="Your plan, payments and renewal." />
      <ComingSoon phase={6} title="Subscription" features={['Choose Starter, Professional or Premium', 'Mock checkout and bank transfer payments', 'Expiration date and renewal', 'Change plan, cancel or resume', 'Payment history']} />
    </>
  );
}
