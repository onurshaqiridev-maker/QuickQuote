import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function AdminReservationsPage() {
  return (
    <>
      <PageHeader title="Manage reservations" description="Every reservation on the platform." />
      <ComingSoon phase={10} title="Manage reservations" features={['Filter by status, business and date', 'Read-only overview']} />
    </>
  );
}
