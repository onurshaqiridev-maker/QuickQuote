import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function ManageServicesPage() {
  return (
    <>
      <PageHeader title="Manage services" description="Your services, prices and durations." />
      <ComingSoon phase={5} title="Manage services" features={['Add, edit and archive services', 'Fixed price, "from" price or price on request', 'Duration for online booking', 'Plan limit: "8 of 10 services used"']} />
    </>
  );
}
