import { AccountSettings } from '../../components/account/AccountSettings';
import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function BusinessSettingsPage() {
  return (
    <>
      <PageHeader title="Business settings" description="Booking rules and your owner account." />
      <ComingSoon phase={5} title="Booking settings" features={['Time zone', 'Slot interval (e.g. every 30 minutes)', 'Minimum notice before a booking', 'How far ahead customers can book', 'Cancellation deadline']} />
      <h2 className="text-lg font-semibold">Owner account</h2>
      <AccountSettings />
    </>
  );
}
