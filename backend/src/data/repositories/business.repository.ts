import type { NewBusiness, NewBusinessProfile } from '../../models/dto/business.dto';
import type { Business, BusinessProfile } from '../../models/entities/business.entity';
import { pool, type Queryable } from '../db';

interface BusinessRow {
  id: string;
  owner_user_id: string;
  status: Business['status'];
  status_reason: string | null;
  approved_at: Date | null;
  approved_by: string | null;
  timezone: string;
  slot_interval_minutes: number;
  min_notice_hours: number;
  max_advance_days: number;
  cancellation_notice_hours: number;
  created_at: Date;
  updated_at: Date;
}

interface ProfileRow {
  business_id: string;
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
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    status: row.status,
    statusReason: row.status_reason,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    timezone: row.timezone,
    slotIntervalMinutes: row.slot_interval_minutes,
    minNoticeHours: row.min_notice_hours,
    maxAdvanceDays: row.max_advance_days,
    cancellationNoticeHours: row.cancellation_notice_hours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProfile(row: ProfileRow): BusinessProfile {
  return {
    businessId: row.business_id,
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
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insert(business: NewBusiness, db: Queryable = pool): Promise<Business> {
  const result = await db.query<BusinessRow>(
    'INSERT INTO businesses (owner_user_id, timezone) VALUES ($1, $2) RETURNING *',
    [business.ownerUserId, business.timezone],
  );
  return toBusiness(result.rows[0]);
}

export async function findByOwnerUserId(ownerUserId: string, db: Queryable = pool): Promise<Business | null> {
  const result = await db.query<BusinessRow>('SELECT * FROM businesses WHERE owner_user_id = $1', [ownerUserId]);
  return result.rows[0] ? toBusiness(result.rows[0]) : null;
}

export async function insertProfile(profile: NewBusinessProfile, db: Queryable = pool): Promise<BusinessProfile> {
  const result = await db.query<ProfileRow>(
    `INSERT INTO business_profiles (business_id, slug, display_name, city)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [profile.businessId, profile.slug, profile.displayName, profile.city],
  );
  return toProfile(result.rows[0]);
}

export async function findProfileByBusinessId(businessId: string, db: Queryable = pool): Promise<BusinessProfile | null> {
  const result = await db.query<ProfileRow>('SELECT * FROM business_profiles WHERE business_id = $1', [businessId]);
  return result.rows[0] ? toProfile(result.rows[0]) : null;
}

/** All slugs equal to `base` or of the form `base-<something>` (used to pick a free slug). */
export async function findSlugsLike(base: string, db: Queryable = pool): Promise<string[]> {
  const result = await db.query<{ slug: string }>(
    `SELECT slug FROM business_profiles WHERE slug = $1 OR slug LIKE $1 || '-%'`,
    [base],
  );
  return result.rows.map((row) => row.slug);
}

export async function addCategoryLinks(businessId: string, categoryIds: string[], db: Queryable = pool): Promise<void> {
  if (categoryIds.length === 0) return;
  await db.query(
    `INSERT INTO business_category_links (business_id, category_id)
     SELECT $1, unnest($2::uuid[])
     ON CONFLICT DO NOTHING`,
    [businessId, categoryIds],
  );
}
