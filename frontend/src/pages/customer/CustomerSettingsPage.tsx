import { AccountSettings } from '../../components/account/AccountSettings';
import { PageHeader } from '../../components/ui/PageHeader';

export function CustomerSettingsPage() {
  return (
    <>
      <PageHeader title="Profile and settings" description="Update your details and your password." />
      <AccountSettings />
    </>
  );
}
