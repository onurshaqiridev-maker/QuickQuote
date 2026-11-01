import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function ManageBusinessesPage() {
  return (
    <>
      <PageHeader title="Manage businesses" description="Review, approve, suspend or deactivate businesses." />
      <ComingSoon phase={10} title="Manage businesses" features={['Search and filter by status', 'Business details: owner, profile, subscription', 'Approve / suspend / deactivate with a reason', 'The owner is emailed automatically']} />
    </>
  );
}
