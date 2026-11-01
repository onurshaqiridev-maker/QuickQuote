import { useSearchParams } from 'react-router';
import { Container } from '../../components/layout/PublicLayout';
import { Badge } from '../../components/ui/Badge';
import { ComingSoon } from '../../components/ui/ComingSoon';
import { PageHeader } from '../../components/ui/PageHeader';

export function ExplorePage() {
  const [params] = useSearchParams();
  const filters = ['search', 'category', 'city']
    .map((key) => [key, params.get(key)] as const)
    .filter(([, value]) => value);

  return (
    <Container>
      <PageHeader title="Explore businesses" description="Search by name, filter by category and city, and compare services and prices." />
      {filters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          Your search:
          {filters.map(([key, value]) => (
            <Badge key={key} color="blue">{key}: {value}</Badge>
          ))}
        </div>
      )}
      <ComingSoon
        phase={7}
        title="The business directory"
        features={[
          'Search businesses by name',
          'Filter by category and city',
          'Featured businesses first',
          'Cards with logo, city and "from €X" prices',
          'Pagination',
          'Only active, approved and published businesses',
        ]}
      />
    </Container>
  );
}
