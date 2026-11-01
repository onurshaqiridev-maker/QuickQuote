import { Container } from '../../components/layout/PublicLayout';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

const FAQ = [
  { q: 'Is Quick Quote free for customers?', a: 'Yes. Creating an account, requesting quotes and booking appointments is always free.' },
  { q: 'How do businesses pay?', a: 'Businesses choose a monthly plan. Their profile is public while the subscription is active.' },
  { q: 'Who checks the businesses?', a: 'Our team reviews every new business before it appears publicly.' },
  { q: 'How do I hear back from a business?', a: 'By email, and in your account under "My reservations" and "My quote requests".' },
];

export function AboutPage() {
  return (
    <Container className="space-y-10">
      <PageHeader title="About Quick Quote" description="We connect people who need a service with the local businesses that offer it." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">For customers</h2>
          <p className="mt-2 text-sm text-slate-600">
            Finding a good business and comparing prices takes time. On Quick Quote you can search by category and city, see
            services and prices at a glance, request quotes and book a free time slot without phone calls.
          </p>
          <ButtonLink to="/register" className="mt-4">Create a free account</ButtonLink>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">For businesses</h2>
          <p className="mt-2 text-sm text-slate-600">
            Get a professional public profile without building your own website. Show your services and prices, set your
            working hours, and receive quote requests and bookings in one dashboard, with email notifications.
          </p>
          <ButtonLink to="/pricing" variant="secondary" className="mt-4">See pricing</ButtonLink>
        </Card>
      </div>
      <section>
        <h2 className="text-xl font-bold">Frequently asked questions</h2>
        <dl className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
          {FAQ.map((item) => (
            <div key={item.q} className="p-5">
              <dt className="font-semibold text-slate-900">{item.q}</dt>
              <dd className="mt-1 text-sm text-slate-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Container>
  );
}
