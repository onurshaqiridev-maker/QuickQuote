import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { assetUrl } from '../../api/client';
import type { BusinessCard as BusinessCardData } from '../../types/api';
import { formatPrice } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { CategoryIcon } from '../ui/CategoryIcon';

/** The business logo, or its first letter on a coloured square when there is no logo. */
export function BusinessLogo({ name, logoUrl, size = 'h-14 w-14' }: { name: string; logoUrl: string | null; size?: string }) {
  const url = assetUrl(logoUrl);
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-xl object-cover ring-1 ring-slate-200`} />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-600`} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

/** One result on the Explore page and the homepage. */
export function BusinessCard({ business }: { business: BusinessCardData }) {
  const price =
    business.startingPriceCents === null ? null : business.startingPriceCents === 0 ? 'Free options' : `from ${formatPrice(business.startingPriceCents)}`;
  return (
    <Link
      to={`/businesses/${business.slug}`}
      className="group flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-500"
    >
      <div className="flex items-start gap-4">
        <BusinessLogo name={business.displayName} logoUrl={business.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{business.displayName}</h3>
            {business.isFeatured && <Badge color="blue">Featured</Badge>}
          </div>
          {business.city && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {business.city}
            </p>
          )}
        </div>
      </div>
      {business.shortDescription && <p className="mt-4 line-clamp-3 text-sm text-slate-600">{business.shortDescription}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {business.categories.map((category) => (
          <span key={category.slug} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            <CategoryIcon name={category.icon} className="h-3.5 w-3.5 text-brand-600" /> {category.name}
          </span>
        ))}
        {price && <span className="ml-auto text-sm font-semibold text-slate-900">{price}</span>}
      </div>
    </Link>
  );
}
