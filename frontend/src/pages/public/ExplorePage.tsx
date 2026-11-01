import { Search, SearchX } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { publicApi } from '../../api/public.api';
import { BusinessCard } from '../../components/business/BusinessCard';
import { Container } from '../../components/layout/PublicLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';

const PAGE_SIZE = 12;
const SELECT = 'rounded-lg border-0 bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none';

export function ExplorePage() {
  // The filters live in the URL, so a search can be bookmarked or shared.
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const city = params.get('city') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchText, setSearchText] = useState(search);
  const categories = useApi('categories', () => publicApi.categories());
  const cities = useApi('cities', () => publicApi.cities());
  const results = useApi(`explore/${search}/${category}/${city}/${page}`, () =>
    publicApi.searchBusinesses({ search, category, city, page, pageSize: PAGE_SIZE }),
  );

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page'); // new filters start at page 1
    setParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    update({ search: searchText.trim() });
  };

  const clearAll = () => {
    setSearchText('');
    setParams(new URLSearchParams());
  };

  const total = results.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || category || city);
  // A city typed on the homepage may not be in the list exactly; keep it selectable.
  const cityOptions = cities.data?.map((c) => c.name) ?? [];
  if (city && !cityOptions.some((name) => name.toLowerCase() === city.toLowerCase())) cityOptions.push(city);

  return (
    <Container>
      <PageHeader title="Explore businesses" description="Search by name or service, and filter by category and city." />

      <form onSubmit={submitSearch} className="mb-8 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto_auto]" role="search">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Business or service, e.g. haircut"
            className="w-full rounded-lg border-0 py-2.5 pr-3 pl-9 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select className={SELECT} value={category} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All categories</option>
            {categories.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">City</span>
          <select className={SELECT} value={cityOptions.find((name) => name.toLowerCase() === city.toLowerCase()) ?? ''} onChange={(e) => update({ city: e.target.value })}>
            <option value="">All cities</option>
            {cityOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <Button type="submit">Search</Button>
      </form>

      <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
        <span>{results.data ? `${total} ${total === 1 ? 'business' : 'businesses'} found` : ''}</span>
        {hasFilters && <button type="button" onClick={clearAll} className="font-semibold text-brand-700 hover:underline">Clear filters</button>}
      </div>

      {results.loading && !results.data && <Spinner label="Finding businesses…" />}
      {results.error && <Alert tone="error">{results.error}</Alert>}

      {results.data && results.data.data.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <SearchX className="h-10 w-10 text-slate-300" aria-hidden />
          <h2 className="mt-4 font-semibold text-slate-900">No businesses match your search</h2>
          <p className="mt-1 text-sm text-slate-500">Try another word, category or city.</p>
          {hasFilters && <Button variant="secondary" className="mt-6" onClick={clearAll}>Clear filters</Button>}
        </div>
      )}

      {results.data && results.data.data.length > 0 && (
        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${results.loading ? 'opacity-60' : ''}`}>
          {results.data.data.map((business) => <BusinessCard key={business.id} business={business} />)}
        </div>
      )}

      {results.data && totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="Pages">
          <Button variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</Button>
          <span className="text-slate-600">Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>Next</Button>
        </nav>
      )}
    </Container>
  );
}
