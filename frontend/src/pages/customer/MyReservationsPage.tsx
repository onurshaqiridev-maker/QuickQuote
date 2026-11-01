import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function MyReservationsPage() {
  return (
    <>
      <PageHeader title="My reservations" description="All your appointments and their status." />
      <ComingSoon phase={8} title="Reservation history" features={['Upcoming, past and cancelled tabs', 'Status: pending, confirmed, rejected, cancelled, completed', 'The business’s message', 'Cancel when it is still allowed']} />
    </>
  );
}
