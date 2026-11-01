import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function MyQuoteRequestsPage() {
  return (
    <>
      <PageHeader title="My quote requests" description="Everything you asked businesses for, and their answers." />
      <ComingSoon phase={9} title="Quote request history" features={['Status: sent, in progress, quote received, declined', 'Your original request', 'The quoted price and message', 'Email when the status changes']} />
    </>
  );
}
