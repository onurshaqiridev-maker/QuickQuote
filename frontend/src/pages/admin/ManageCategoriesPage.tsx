import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function ManageCategoriesPage() {
  return (
    <>
      <PageHeader title="Manage categories" description="The categories businesses can choose." />
      <ComingSoon phase={10} title="Manage categories" features={['Create and edit categories', 'Reorder and deactivate', 'Delete when unused', 'Business count per category']} />
    </>
  );
}
