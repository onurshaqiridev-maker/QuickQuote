import { useParams } from 'react-router';
import { Container } from '../../components/layout/PublicLayout';
import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function BusinessDetailsPage() {
  const { slug } = useParams();
  return (
    <Container className="space-y-6">
      <PageHeader title="Business profile" description={<>Public profile for <code className="rounded bg-slate-100 px-1.5 py-0.5">{slug}</code></>} />
      <ComingSoon phase={7} title="Public profile" features={['Logo, photos and description', 'Address and contact details', 'Services with prices and durations', 'Weekly working hours']} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoon phase={8} title="Booking panel" features={['Choose a service', 'Pick a date and a free time slot', 'Add notes and confirm', 'No double bookings']} />
        <ComingSoon phase={9} title="Request a quote" features={['For one service or a general request', 'Describe what you need', 'Optional budget and date', 'Answer arrives by email']} />
      </div>
    </Container>
  );
}
