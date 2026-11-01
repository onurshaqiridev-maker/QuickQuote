import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../hooks/useAuth';

export function CustomerOverviewPage() {
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0];
  return (
    <>
      <PageHeader title={`Hi ${firstName}!`} description="Here you will find your upcoming appointments and your quote requests." action={<ButtonLink to="/explore">Find a business</ButtonLink>} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Upcoming reservations</h2>
          <p className="mt-2 text-sm text-slate-600">You have no reservations yet. Booking arrives in phase 8.</p>
          <ButtonLink to="/account/reservations" variant="secondary" className="mt-4">My reservations</ButtonLink>
        </Card>
        <Card>
          <h2 className="font-semibold">Latest quote requests</h2>
          <p className="mt-2 text-sm text-slate-600">You have not requested any quotes yet. Quote requests arrive in phase 9.</p>
          <ButtonLink to="/account/quotes" variant="secondary" className="mt-4">My quote requests</ButtonLink>
        </Card>
      </div>
    </>
  );
}
