import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function ManageCustomersPage() {
  return (
    <>
      <PageHeader title="Manage customers" description="All registered users." />
      <ComingSoon phase={10} title="Manage customers" features={['Search by name or email', 'Filter by role and status', 'Reservation and quote counts', 'Suspend or reactivate accounts']} />
    </>
  );
}
