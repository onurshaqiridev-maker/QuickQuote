import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function AdminQuoteRequestsPage() {
  return (
    <>
      <PageHeader title="Manage quote requests" description="Every quote request on the platform." />
      <ComingSoon phase={10} title="Manage quote requests" features={['Filter by status and business', 'Read-only overview']} />
    </>
  );
}
