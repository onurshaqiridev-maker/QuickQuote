import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { publicApi } from '../../api/public.api';
import { BusinessCard } from '../../components/business/BusinessCard';
import { Container } from '../../components/layout/PublicLayout';
import { Button, ButtonLink } from '../../components/ui/Button';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import { usePageTitle } from '../../hooks/usePageTitle';

const STEPS = [
  { title: 'Find', text: 'Search businesses by name, category and city. Compare services and prices.' },
  { title: 'Ask or book', text: 'Request a quote for your project, or book a free time slot in a few clicks.' },
  { title: 'Get it done', text: 'The business confirms by email. Follow everything in your free account.' },
];

export function HomePage() {
  usePageTitle();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const categories = useApi('categories', () => publicApi.categories());
  const config = useApi('config', () => publicApi.config());
  // Featured businesses come first in the results, then the newest ones.
  const highlights = useApi('home-businesses', () => publicApi.searchBusinesses({ pageSize: 6 }));
  const freeLaunch = config.data?.subscriptionsRequired === false;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (city.trim()) params.set('city', city.trim());
    navigate(`/explore${params.size ? `?${params}` : ''}`);
  };

  return (
    <>
      {/* Hero with search */}
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <Container className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Quotes and bookings, in one place</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Find trusted local businesses. Get quotes. Book in minutes.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              From hairdressers to plumbers: compare services and prices, ask for a quote, or book a free time slot.
              Free for customers.
            </p>
          </div>
          <form
            onSubmit={submitSearch}
            className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-200 sm:flex-row"
            role="search"
          >
            <label className="sr-only" htmlFor="home-search">Business or service</label>
            <input id="home-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="What do you need? e.g. haircut, plumber" className="flex-1 rounded-lg px-4 py-3 text-sm outline-none ring-slate-200 focus:ring-2" />
            <label className="sr-only" htmlFor="home-city">City</label>
            <input id="home-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-lg px-4 py-3 text-sm outline-none ring-slate-200 focus:ring-2 sm:w-48" />
            <Button type="submit" className="px-6">Search</Button>
          </form>
        </Container>
      </section>

      {/* Categories from the API */}
      <Container>
        <h2 className="text-2xl font-bold text-slate-900">Browse by category</h2>
        <div className="mt-6">
          {categories.loading && <Spinner label="Loading categories…" />}
          {categories.error && <p className="text-sm text-red-600">{categories.error}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.data?.map((category) => (
              <Link
                key={category.id}
                to={`/explore?category=${category.slug}`}
                className="group rounded-xl bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-500"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                  <CategoryIcon name={category.icon} />
                </span>
                <p className="mt-3 font-semibold text-slate-900 group-hover:text-brand-700">{category.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </Container>

      {/* A few businesses to discover */}
      {highlights.data && highlights.data.data.length > 0 && (
        <Container className="pt-0">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Discover businesses</h2>
            <Link to="/explore" className="text-sm font-semibold text-brand-700 hover:underline">
              See all {highlights.data.meta.total}
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.data.data.map((business) => <BusinessCard key={business.id} business={business} />)}
          </div>
        </Container>
      )}

      {/* How it works */}
      <section className="bg-white">
        <Container>
          <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* For businesses */}
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-slate-900 p-8 text-white sm:p-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Own a business? Get found by new customers.</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Create your public profile, list your services and prices, and receive quote requests and bookings,
              {freeLaunch ? ' free during our launch.' : ' from €19 per month.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <ButtonLink to="/pricing" variant="secondary">See pricing</ButtonLink>
            <ButtonLink to="/register/business">List your business</ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
