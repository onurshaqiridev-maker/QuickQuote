import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function BusinessReservationsPage() {
  return (
    <>
      <PageHeader title="Manage reservations" description="Confirm, reject and manage your appointments." />
      <ComingSoon phase={8} title="Manage reservations" features={['Pending, upcoming and past tabs', 'Customer information and notes', 'Confirm, reject, cancel, complete', 'Customers are emailed automatically']} />
    </>
  );
}
