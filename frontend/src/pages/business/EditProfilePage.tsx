import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function EditProfilePage() {
  return (
    <>
      <PageHeader title="Edit business profile" description="What customers see on your public page." />
      <ComingSoon phase={5} title="Edit business profile" features={['Company name and description', 'Contact details and address', 'Logo and photo gallery', 'Categories (1 to 3)', 'Publish / unpublish with a checklist', 'Preview your public page']} />
    </>
  );
}
