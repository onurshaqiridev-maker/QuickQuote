import { Link } from 'react-router';
import { publicApi } from '../../api/public.api';
import { Container } from '../../components/layout/PublicLayout';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useApi } from '../../hooks/useApi';

const CUSTOMER_STEPS = [
  { title: 'Find a business', text: 'Search by service, category and city. Every profile shows services, prices, opening hours and photos.' },
  { title: 'Book or ask for a quote', text: 'Pick a free time and book online, or describe what you need and ask for a personal price.' },
  { title: 'Get an answer', text: 'The business confirms your booking or sends a quote. You get an email, and everything is in your account.' },
];

const BUSINESS_STEPS = [
  { title: 'Create your profile', text: 'Add your description, logo, photos, services with prices and your working hours.' },
  { title: 'Get approved', text: 'Our team checks every new business. You get an email as soon as you are live.' },
  { title: 'Receive customers', text: 'Confirm bookings and answer quote requests in one dashboard. Customers are emailed automatically.' },
];

function Steps({ title, steps }: { title: string; steps: { title: string; text: string }[] }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold">{title}</h3>
      <ol className="mt-4 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{index + 1}</span>
            <span>
              <span className="block font-medium text-slate-900">{step.title}</span>
              <span className="block text-sm text-slate-600">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function AboutPage() {
  const config = useApi('config', () => publicApi.config());
  const freeLaunch = config.data?.subscriptionsRequired !== true;

  const faq = [
    { q: 'Is Quick Quote free for customers?', a: 'Yes. Creating an account, requesting quotes and booking appointments is always free.' },
    {
      q: 'What does it cost for businesses?',
      a: freeLaunch
        ? 'During our launch, listing a business is free. Paid plans with more services and photos will come later, and we will tell you well in advance.'
        : 'Businesses choose a monthly plan. Their profile is public while the subscription is active.',
    },
    { q: 'Who checks the businesses?', a: 'Our team reviews every new business before it appears publicly.' },
    { q: 'Can I cancel a booking?', a: 'Yes, online in "My reservations" until the cancellation deadline the business has set (you see it when you book). After that, please call the business.' },
    { q: 'What happens when I accept a quote?', a: 'The business is told by email and contacts you to plan the next steps. You also see their phone number and email next to the quote.' },
    { q: 'How do I hear back from a business?', a: 'By email, and in your account under "My reservations" and "My quote requests".' },
  ];

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
          <ButtonLink to={freeLaunch ? '/register/business' : '/pricing'} variant="secondary" className="mt-4">
            {freeLaunch ? 'List your business for free' : 'See pricing'}
          </ButtonLink>
        </Card>
      </div>

      <section>
        <h2 className="text-xl font-bold">How it works</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <Steps title="As a customer" steps={CUSTOMER_STEPS} />
          <Steps title="As a business" steps={BUSINESS_STEPS} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Frequently asked questions</h2>
        <dl className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
          {faq.map((item) => (
            <div key={item.q} className="p-5">
              <dt className="font-semibold text-slate-900">{item.q}</dt>
              <dd className="mt-1 text-sm text-slate-600">{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-slate-600">
          Another question? <Link to="/contact" className="font-medium text-brand-700 hover:underline">Contact us</Link>.
        </p>
      </section>
    </Container>
  );
}
