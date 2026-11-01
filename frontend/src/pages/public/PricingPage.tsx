import { Check } from 'lucide-react';
import { publicApi } from '../../api/public.api';
import { Container } from '../../components/layout/PublicLayout';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { Plan } from '../../types/api';
import { formatPrice } from '../../utils/format';

function planFeatures(plan: Plan): string[] {
  return [
    'Public business profile',
    'Reservations and quote requests',
    'Email notifications',
    plan.maxServices === null ? 'Unlimited services' : `Up to ${plan.maxServices} services`,
    `Up to ${plan.maxPhotos} photos`,
    ...(plan.isFeatured ? ['Featured on the homepage', 'Listed first in search'] : []),
  ];
}

const FAQ = [
  { q: 'How does billing work?', a: 'Plans are paid monthly, in advance. You can renew from your dashboard.' },
  { q: 'Can I change or cancel my plan?', a: 'Yes. Plan changes apply from your next month. If you cancel, you keep everything until the paid month ends.' },
  { q: 'What happens if I do not renew?', a: 'You get a 3-day grace period. After that your profile is hidden until you pay again.' },
  { q: 'Do customers pay anything?', a: 'No. Quick Quote is always free for customers.' },
];

export function PricingPage() {
  const { data: plans, loading, error } = useApi('plans', () => publicApi.plans());

  return (
    <Container className="space-y-12">
      <PageHeader title="Simple monthly plans" description="Customers use Quick Quote for free. Businesses choose the plan that fits them." />
      {loading && <Spinner label="Loading plans…" />}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-3xl bg-white p-8 ring-1 ${plan.isFeatured ? 'shadow-xl ring-2 ring-brand-600' : 'ring-slate-200'}`}
          >
            {plan.isFeatured && (
              <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Most visibility</span>
            )}
            <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
            <p className="mt-2 min-h-10 text-sm text-slate-600">{plan.description}</p>
            <p className="mt-6">
              <span className="text-4xl font-bold tracking-tight">{formatPrice(plan.priceCents, plan.currency)}</span>
              <span className="text-sm text-slate-500"> / month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
              {planFeatures(plan).map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>
            <ButtonLink to={`/register/business?plan=${plan.code}`} variant={plan.isFeatured ? 'primary' : 'secondary'} className="mt-8">
              Get started with {plan.name}
            </ButtonLink>
          </div>
        ))}
      </div>
      <section>
        <h2 className="text-xl font-bold">Questions about pricing</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1 text-sm text-slate-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Container>
  );
}
