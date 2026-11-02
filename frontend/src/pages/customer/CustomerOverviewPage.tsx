import { Link } from 'react-router';
import { customerApi } from '../../api/customer.api';
import { DecisionBadge, QuoteStatusBadge } from '../../components/quotes/QuoteStatusBadge';
import { CustomerReservationCard } from '../../components/reservations/CustomerReservationCard';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
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
      <PageHeader title={`Hi ${firstName}!`} description="Your appointments and quote requests at a glance." action={<ButtonLink to="/explore">Find a business</ButtonLink>} />
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
      {overview.data && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest quote requests</h2>
            <Link to="/account/quotes" className="text-sm font-semibold text-brand-700 hover:underline">All quote requests</Link>
          </div>
          {overview.data.quotes.recent.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">Need a price first? Open a business page and click "Request a quote".</p>
            </Card>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
              {overview.data.quotes.recent.map((quote) => (
                <li key={quote.id}>
                  <Link to="/account/quotes" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{quote.subject}</span>
                      <span className="block truncate text-sm text-slate-500">{quote.business.displayName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {quote.canDecide && <Badge color="blue">Your answer needed</Badge>}
                      {quote.customerDecision ? <DecisionBadge decision={quote.customerDecision} viewer="customer" /> : <QuoteStatusBadge status={quote.status} viewer="customer" />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
