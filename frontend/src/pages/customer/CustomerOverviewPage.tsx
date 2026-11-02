import { Link } from 'react-router';
import { customerApi } from '../../api/customer.api';
import { CustomerReservationCard } from '../../components/reservations/CustomerReservationCard';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';

export function CustomerOverviewPage() {
  const { user } = useAuth();
  const overview = useApi('customer-overview', () => customerApi.overview());
  const firstName = user?.fullName.split(' ')[0];
  const counts = overview.data?.counts;

  return (
    <>
      <PageHeader title={`Hi ${firstName}!`} description="Your upcoming appointments at a glance." action={<ButtonLink to="/explore">Find a business</ButtonLink>} />
      {counts && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[['Upcoming', counts.upcoming, 'upcoming'], ['Past', counts.past, 'past'], ['Cancelled or declined', counts.cancelled, 'cancelled']].map(([label, value, tab]) => (
            <Link key={label as string} to={`/account/reservations?tab=${tab}`} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-500">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
            </Link>
          ))}
        </div>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Next appointments</h2>
        {overview.loading && !overview.data && <Spinner />}
        {overview.error && <Alert tone="error">{overview.error}</Alert>}
        {overview.data && overview.data.upcoming.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">No upcoming appointments. Find a business and book a free time.</p>
            <ButtonLink to="/explore" variant="secondary" className="mt-4">Explore businesses</ButtonLink>
          </Card>
        )}
        <ul className="space-y-4">
          {overview.data?.upcoming.map((reservation) => <CustomerReservationCard key={reservation.id} reservation={reservation} onChanged={overview.reload} />)}
        </ul>
      </section>
      <Card>
        <h2 className="font-semibold">Quote requests</h2>
        <p className="mt-2 text-sm text-slate-600">Asking businesses for a price arrives in phase 9.</p>
      </Card>
    </>
  );
}
