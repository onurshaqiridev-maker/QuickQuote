import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function BusinessQuoteRequestsPage() {
  return (
    <>
      <PageHeader title="Manage quote requests" description="Answer customers who asked for a price." />
      <ComingSoon phase={9} title="Manage quote requests" features={['New, in progress, answered and declined tabs', 'Customer information and request details', 'Send a quote with a price and message', 'Customers are emailed automatically']} />
    </>
  );
}
