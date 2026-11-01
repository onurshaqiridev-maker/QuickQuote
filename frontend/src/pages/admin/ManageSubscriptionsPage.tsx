import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function ManageSubscriptionsPage() {
  return (
    <>
      <PageHeader title="Manage subscriptions" description="Subscriptions, payments and plans." />
      <ComingSoon phase={6} title="Manage subscriptions" features={['Subscriptions by status', 'Mark bank transfers as paid or failed', 'Create and edit plans and prices', 'Monthly recurring revenue']} />
    </>
  );
}
