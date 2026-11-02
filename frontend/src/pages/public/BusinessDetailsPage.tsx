import { Clock, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { assetUrl } from '../../api/client';
import { publicApi } from '../../api/public.api';
import { BookingPanel } from '../../components/booking/BookingPanel';
import { BusinessLogo } from '../../components/business/BusinessCard';
import { Container } from '../../components/layout/PublicLayout';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { PublicBusiness } from '../../types/api';
import { formatDuration, priceLabel } from '../../utils/format';
import { DAY_NAMES } from '../../utils/timezones';

/** Today's weekday (1 = Monday ... 7 = Sunday) in the business's own time zone. */
function todayIn(timezone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone }).format(new Date());
  return DAY_NAMES.indexOf(name) + 1;
}

function OpeningHours({ business }: { business: PublicBusiness }) {
  const today = todayIn(business.timezone);
  return (
    <Card>
      <CardTitle>Opening hours</CardTitle>
      <dl className="space-y-2 text-sm">
        {DAY_NAMES.map((name, index) => {
          const day = index + 1;
          const ranges = business.workingHours.filter((r) => r.dayOfWeek === day);
          return (
            <div key={day} className={`flex justify-between gap-4 rounded-lg px-2 py-1 ${day === today ? 'bg-brand-50 font-semibold text-brand-700' : ''}`}>
              <dt>{name}{day === today && <span className="ml-1 text-xs font-normal">(today)</span>}</dt>
              <dd className={ranges.length ? '' : 'text-slate-400'}>
                {ranges.length ? ranges.map((r) => `${r.startTime}–${r.endTime}`).join(', ') : 'Closed'}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-xs text-slate-500">Times in {business.timezone.replace('_', ' ')}.</p>
    </Card>
  );
}

function ContactCard({ business }: { business: PublicBusiness }) {
  const { contact, address } = business;
  const addressText = [address.line, [address.postalCode, address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const mapUrl = addressText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.displayName}, ${addressText}`)}` : null;
  const row = 'flex items-start gap-3 text-sm text-slate-700';
  return (
    <Card>
      <CardTitle>Contact</CardTitle>
      <ul className="space-y-3">
        {addressText && (
          <li className={row}>
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              {addressText}
              {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-brand-700 hover:underline">Map</a>}
            </span>
          </li>
        )}
        {contact.phone && (
          <li className={row}><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:underline">{contact.phone}</a></li>
        )}
        {contact.email && (
          <li className={row}><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /><a href={`mailto:${contact.email}`} className="break-all hover:underline">{contact.email}</a></li>
        )}
        {contact.websiteUrl && (
          <li className={row}><Globe className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /><a href={contact.websiteUrl} target="_blank" rel="noreferrer" className="break-all hover:underline">{contact.websiteUrl.replace(/^https?:\/\//, '')}</a></li>
        )}
      </ul>
    </Card>
  );
}

export function BusinessDetailsPage() {
  const { slug = '' } = useParams();
  const { data: business, error, loading } = useApi(`business/${slug}`, () => publicApi.business(slug));
  // ?book=<serviceId> opens the booking dialog (e.g. when coming back from the login page).
  const [params, setParams] = useSearchParams();
  const [bookingId, setBookingId] = useState<string | null>(params.get('book'));
  const closeBooking = () => {
    setBookingId(null);
    if (params.has('book')) setParams({}, { replace: true });
  };

  if (loading && !business) return <FullPageSpinner />;
  if (error || !business) {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-2xl font-bold">This business is not available</h1>
        <p className="mt-3 text-slate-600">It may have been removed, or the address is wrong.</p>
        <ButtonLink to="/explore" className="mt-8">Explore businesses</ButtonLink>
      </Container>
    );
  }

  const [mainPhoto, ...otherPhotos] = business.photos;
  const bookingService = business.services.find((service) => service.id === bookingId && service.isBookable && service.durationMinutes);
  return (
    <Container className="space-y-8">
      <Link to="/explore" className="text-sm font-medium text-brand-700 hover:underline">Back to all businesses</Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <BusinessLogo name={business.displayName} logoUrl={business.logoUrl} size="h-20 w-20" />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{business.displayName}</h1>
            {business.isFeatured && <Badge color="blue">Featured</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {business.address.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {business.address.city}</span>}
            {business.categories.map((category) => (
              <Link key={category.slug} to={`/explore?category=${category.slug}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-brand-50">
                <CategoryIcon name={category.icon} className="h-3.5 w-3.5 text-brand-600" /> {category.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {mainPhoto && (
        <section aria-label="Photos" className="grid gap-3 md:grid-cols-3">
          <figure className={`overflow-hidden rounded-2xl ${otherPhotos.length ? 'md:col-span-2' : 'md:col-span-3'}`}>
            <img src={assetUrl(mainPhoto.imageUrl) ?? ''} alt={mainPhoto.caption ?? business.displayName} className="h-72 w-full object-cover md:h-96" />
          </figure>
          {otherPhotos.length > 0 && (
            // The side photos share the height of the main photo (1 photo = full height, 2 = half each).
            <div className="grid gap-3 md:h-96" style={{ gridTemplateRows: `repeat(${Math.min(otherPhotos.length, 2)}, minmax(0, 1fr))` }}>
              {otherPhotos.slice(0, 2).map((photo) => (
                <figure key={photo.id} className="relative h-40 overflow-hidden rounded-2xl md:h-full">
                  <img src={assetUrl(photo.imageUrl) ?? ''} alt={photo.caption ?? ''} className="h-full w-full object-cover" />
                  {photo.caption && <figcaption className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white">{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {business.description && (
            <section>
              <h2 className="text-xl font-bold">About</h2>
              <p className="mt-3 whitespace-pre-line text-slate-700">{business.description}</p>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold">Services and prices</h2>
            <p className="mt-1 text-sm text-slate-600">Book a free time online, or contact {business.displayName} for services marked "quote on request".</p>
            <ul className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
              {business.services.map((service) => (
                <li key={service.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                    {service.description && <p className="mt-1 text-sm text-slate-600">{service.description}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {service.durationMinutes && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {formatDuration(service.durationMinutes)}</span>}
                      {!service.isBookable && <Badge>Quote on request</Badge>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <span className="text-lg font-semibold text-slate-900">{priceLabel(service.priceType, service.priceCents)}</span>
                    {service.isBookable && service.durationMinutes && <Button onClick={() => setBookingId(service.id)}>Book</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <ContactCard business={business} />
          <OpeningHours business={business} />
        </aside>
      </div>
      {bookingService && <BookingPanel business={business} service={bookingService} onClose={closeBooking} />}
    </Container>
  );
}
