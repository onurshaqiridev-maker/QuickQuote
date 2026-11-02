/** Public discovery: search businesses, show a public profile, list cities. */
import { env } from '../config/env';
import * as businessRepository from '../data/repositories/business.repository';
import * as offeringRepository from '../data/repositories/offering.repository';
import * as photoRepository from '../data/repositories/photo.repository';
import * as publicBusinessRepository from '../data/repositories/public-business.repository';
import * as scheduleRepository from '../data/repositories/schedule.repository';
import type { Page } from '../models/dto/page.dto';
import { NotFoundError } from '../models/errors';
import type { SearchBusinessesQuery } from '../models/requests/discovery.requests';
import type { BusinessCardResponse, CityResponse, PublicBusinessResponse } from '../models/responses/discovery.response';
import { toPhotoResponse } from './mappers';

const SHORT_DESCRIPTION_LENGTH = 160;

function shorten(text: string | null): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= SHORT_DESCRIPTION_LENGTH ? clean : `${clean.slice(0, SHORT_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

export async function searchBusinesses(query: SearchBusinessesQuery): Promise<Page<BusinessCardResponse>> {
  const page = await publicBusinessRepository.search({
    search: query.search,
    categorySlug: query.category,
    city: query.city,
    featuredOnly: query.featured,
    page: query.page,
    pageSize: query.pageSize,
    requireSubscription: env.SUBSCRIPTIONS_REQUIRED,
  });
  return {
    ...page,
    items: page.items.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      shortDescription: shorten(row.description),
      logoUrl: row.logoUrl,
      city: row.city,
      isFeatured: row.isFeatured,
      startingPriceCents: row.startingPriceCents,
      categories: row.categories,
    })),
  };
}

export async function getPublicBusiness(slug: string): Promise<PublicBusinessResponse> {
  const business = await publicBusinessRepository.findVisibleBySlug(slug, env.SUBSCRIPTIONS_REQUIRED);
  // Not visible (unpublished, not approved, suspended...) looks exactly like "does not exist".
  if (!business) throw new NotFoundError('This business is not available.');

  const [categories, photos, services, hours] = await Promise.all([
    businessRepository.listCategories(business.id),
    photoRepository.listByBusiness(business.id),
    offeringRepository.listByBusiness(business.id),
    scheduleRepository.listWorkingHours(business.id),
  ]);

  return {
    id: business.id,
    slug: business.slug,
    displayName: business.displayName,
    description: business.description,
    logoUrl: business.logoUrl,
    isFeatured: business.isFeatured,
    timezone: business.timezone,
    booking: {
      maxAdvanceDays: business.maxAdvanceDays,
      minNoticeHours: business.minNoticeHours,
      cancellationNoticeHours: business.cancellationNoticeHours,
    },
    contact: { email: business.contactEmail, phone: business.contactPhone, websiteUrl: business.websiteUrl },
    address: { line: business.addressLine, city: business.city, postalCode: business.postalCode, country: business.country },
    categories: categories.filter((c) => c.isActive).map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
    photos: photos.map(toPhotoResponse),
    services: services
      .filter((service) => service.isActive)
      .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        priceType: service.priceType,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
        isBookable: service.isBookable,
      })),
    workingHours: hours.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
  };
}

export async function listCities(): Promise<CityResponse[]> {
  const cities = await publicBusinessRepository.listCities(env.SUBSCRIPTIONS_REQUIRED);
  return cities.map((city) => ({ name: city.name, businessCount: city.count }));
}
