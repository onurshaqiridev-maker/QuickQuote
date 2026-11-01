import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function WorkingHoursPage() {
  return (
    <>
      <PageHeader title="Working hours" description="When customers can book you." />
      <ComingSoon phase={5} title="Working hours" features={['Opening times for each weekday', 'Several time ranges per day (lunch breaks)', 'Block holidays and days off', 'Free slots are calculated from these']} />
    </>
  );
}
