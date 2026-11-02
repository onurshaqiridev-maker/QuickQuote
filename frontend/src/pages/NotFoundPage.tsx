import { Container } from '../components/layout/PublicLayout';
import { ButtonLink } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-slate-600">Sorry, we could not find the page you are looking for.</p>
      <ButtonLink to="/" className="mt-8">Back to the homepage</ButtonLink>
    </Container>
  );
}
