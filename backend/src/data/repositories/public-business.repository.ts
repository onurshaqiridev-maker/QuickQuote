/**
 * Public business queries (Explore page, public profile, city list).
 *
 * THE PUBLIC VISIBILITY RULE LIVES HERE, in one place. A business is visible when:
 *   - it is approved by an admin,
 *   - its profile is published,
 *   - its owner's account is active,
 *   - and, only when paid plans are on, it has an active (or grace-period) subscription.
 */
import type { BusinessCardRow, BusinessSearchFilter, PublicBusinessRow } from '../../models/dto/discovery.dto';
import type { Page } from '../../models/dto/page.dto';
import { pool, type Queryable } from '../db';
import { containsPattern } from '../search-pattern';

const FROM = `
  FROM businesses b
  JOIN business_profiles p ON p.business_id = b.id
  JOIN users owner ON owner.id = b.owner_user_id`;

/** $1 = requireSubscription (boolean) */
const VISIBLE = `
  b.status = 'approved'
  AND p.is_published
  AND owner.status = 'active'
  AND ($1::boolean = false OR EXISTS (
        SELECT 1 FROM subscriptions s
         WHERE s.business_id = b.id AND s.status IN ('active', 'past_due')))`;

const IS_FEATURED = `
  EXISTS (SELECT 1 FROM subscriptions s
            JOIN subscription_plans pl ON pl.id = s.plan_id
           WHERE s.business_id = b.id AND s.status IN ('active', 'past_due') AND pl.is_featured)`;

/** Prefix match for the city filter ("berl" finds "Berlin"), with wildcards escaped. */
function startsWithPattern(text: string): string {
  return `${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

interface CardRow {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  is_featured: boolean;
  starting_price_cents: number | null;
  categories: { slug: string; name: string; icon: string | null }[];
}

export async function search(filter: BusinessSearchFilter, db: Queryable = pool): Promise<Page<BusinessCardRow>> {
  const where = `
    WHERE ${VISIBLE}
      AND ($2::text IS NULL
           OR p.display_name ILIKE $2
           OR EXISTS (SELECT 1 FROM services sv WHERE sv.business_id = b.id AND sv.is_active AND sv.name ILIKE $2)
           OR EXISTS (SELECT 1 FROM business_category_links l JOIN categories c ON c.id = l.category_id
                       WHERE l.business_id = b.id AND c.name ILIKE $2))
      AND ($3::text IS NULL
           OR EXISTS (SELECT 1 FROM business_category_links l JOIN categories c ON c.id = l.category_id
                       WHERE l.business_id = b.id AND c.slug = $3 AND c.is_active))
      AND ($4::text IS NULL OR p.city ILIKE $4)
      AND ($5::boolean = false OR ${IS_FEATURED})`;
  const params = [
    filter.requireSubscription,
    filter.search ? containsPattern(filter.search) : null,
    filter.categorySlug ?? null,
    filter.city ? startsWithPattern(filter.city) : null,
    filter.featuredOnly,
  ];

  const [rows, count] = await Promise.all([
    db.query<CardRow>(
      `SELECT b.id, p.slug, p.display_name, p.description, p.logo_url, p.city, p.published_at,
              ${IS_FEATURED} AS is_featured,
              (SELECT min(sv.price_cents) FROM services sv
                WHERE sv.business_id = b.id AND sv.is_active AND sv.price_type <> 'on_request') AS starting_price_cents,
              coalesce((SELECT json_agg(json_build_object('slug', c.slug, 'name', c.name, 'icon', c.icon) ORDER BY c.sort_order)
                          FROM business_category_links l JOIN categories c ON c.id = l.category_id
                         WHERE l.business_id = b.id AND c.is_active), '[]'::json) AS categories
       ${FROM} ${where}
       ORDER BY is_featured DESC, p.published_at DESC NULLS LAST, p.display_name
       LIMIT $6 OFFSET $7`,
      [...params, filter.pageSize, (filter.page - 1) * filter.pageSize],
    ),
    db.query<{ count: string }>(`SELECT count(*) ${FROM} ${where}`, params),
  ]);

  return {
    items: rows.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayName: row.display_name,
      description: row.description,
      logoUrl: row.logo_url,
      city: row.city,
      isFeatured: row.is_featured,
      startingPriceCents: row.starting_price_cents,
      categories: row.categories,
    })),
    total: Number(count.rows[0].count),
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

interface ProfileRow {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string;
  slot_interval_minutes: number;
  min_notice_hours: number;
  max_advance_days: number;
  cancellation_notice_hours: number;
  is_featured: boolean;
}

const PROFILE_SELECT = `
  SELECT b.id, b.timezone, b.slot_interval_minutes, b.min_notice_hours, b.max_advance_days, b.cancellation_notice_hours,
         p.slug, p.display_name, p.description, p.logo_url, p.contact_email, p.contact_phone,
         p.website_url, p.address_line, p.city, p.postal_code, p.country, ${IS_FEATURED} AS is_featured
    ${FROM}`;

/** The business behind a public URL - only if it is visible. */
export async function findVisibleBySlug(slug: string, requireSubscription: boolean, db: Queryable = pool): Promise<PublicBusinessRow | null> {
  const result = await db.query<ProfileRow>(`${PROFILE_SELECT} WHERE ${VISIBLE} AND p.slug = $2`, [requireSubscription, slug]);
  return toPublicRow(result.rows[0]);
}

/** Same, by id (used when booking). */
export async function findVisibleById(id: string, requireSubscription: boolean, db: Queryable = pool): Promise<PublicBusinessRow | null> {
  const result = await db.query<ProfileRow>(`${PROFILE_SELECT} WHERE ${VISIBLE} AND b.id = $2`, [requireSubscription, id]);
  return toPublicRow(result.rows[0]);
}

function toPublicRow(row: ProfileRow | undefined): PublicBusinessRow | null {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    description: row.description,
    logoUrl: row.logo_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    addressLine: row.address_line,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    timezone: row.timezone,
    slotIntervalMinutes: row.slot_interval_minutes,
    minNoticeHours: row.min_notice_hours,
    maxAdvanceDays: row.max_advance_days,
    cancellationNoticeHours: row.cancellation_notice_hours,
    isFeatured: row.is_featured,
  };
}

/** Cities that have visible businesses, for the location filter. "berlin" and "Berlin" count as one. */
export async function listCities(requireSubscription: boolean, db: Queryable = pool): Promise<{ name: string; count: number }[]> {
  const result = await db.query<{ name: string; count: string }>(
    `SELECT min(trim(p.city)) AS name, count(*) AS count
       ${FROM}
      WHERE ${VISIBLE} AND coalesce(trim(p.city), '') <> ''
      GROUP BY lower(trim(p.city))
      ORDER BY 1`,
    [requireSubscription],
  );
  return result.rows.map((row) => ({ name: row.name, count: Number(row.count) }));
}

/** How many businesses customers can see right now (admin overview). */
export async function countVisible(requireSubscription: boolean, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT count(*) FROM businesses b
       JOIN business_profiles p ON p.business_id = b.id
       JOIN users owner ON owner.id = b.owner_user_id
      WHERE ${VISIBLE}`,
    [requireSubscription],
  );
  return Number(result.rows[0].count);
}
