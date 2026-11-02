/** A visible business as read for search results. */
export interface BusinessCardRow {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  isFeatured: boolean;
  startingPriceCents: number | null;
  categories: { slug: string; name: string; icon: string | null }[];
}

/** A visible business as read for its public page (photos, services etc. are loaded separately). */
export interface PublicBusinessRow {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  cancellationNoticeHours: number;
  isFeatured: boolean;
}

export interface BusinessSearchFilter {
  search?: string;
  categorySlug?: string;
  city?: string;
  featuredOnly: boolean;
  page: number;
  pageSize: number;
  /** true when paid plans are on: only businesses with an active subscription are visible. */
  requireSubscription: boolean;
}
