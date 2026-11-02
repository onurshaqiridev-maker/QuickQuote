import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

/** Subscriptions are switched off during the free launch (SUBSCRIPTIONS_REQUIRED=false). */
export function ManageSubscriptionsPage() {
  return (
    <>
      <PageHeader title="Subscriptions" description="Plans, subscriptions and payments." />
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Free launch: no payments yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          During the launch, businesses list for free, so there are no subscriptions or payments to manage. The plans and their
          limits are already in the database (Starter limits apply to everyone).
        </p>
        <p className="mt-2 text-sm text-slate-600">
          When payments are switched on later, this page will show subscriptions by status, let you mark bank transfers as paid or
          failed, and manage plans and prices. See <Link to="/pricing" className="font-medium text-brand-700 hover:underline">the pricing page</Link> for what businesses see today.
        </p>
      </Card>
    </>
  );
}
