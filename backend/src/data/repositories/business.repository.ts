import type {
  BookingSettingsChanges,
  GoLiveFacts,
  NewBusiness,
  NewBusinessProfile,
  ProfileChanges,
} from '../../models/dto/business.dto';
import type { BusinessStatusChange } from '../../models/dto/admin.dto';
import type { Category } from '../../models/entities/category.entity';
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

export async function findById(id: string, db: Queryable = pool): Promise<Business | null> {
  const result = await db.query<BusinessRow>('SELECT * FROM businesses WHERE id = $1', [id]);
  return result.rows[0] ? toBusiness(result.rows[0]) : null;
}

export async function updateProfile(
  businessId: string,
  changes: ProfileChanges,
  db: Queryable = pool,
): Promise<BusinessProfile | null> {
  const result = await db.query<ProfileRow>(
    `UPDATE business_profiles
        SET display_name = $2, description = $3, contact_email = $4, contact_phone = $5, website_url = $6,
            address_line = $7, city = $8, postal_code = $9, country = $10
      WHERE business_id = $1
      RETURNING *`,
    [
      businessId,
      changes.displayName,
      changes.description,
      changes.contactEmail,
      changes.contactPhone,
      changes.websiteUrl,
      changes.addressLine,
      changes.city,
      changes.postalCode,
      changes.country,
    ],
  );
  return result.rows[0] ? toProfile(result.rows[0]) : null;
}

/** Sets (or clears, with null) the logo. Returns the PREVIOUS logo URL so its file can be deleted. */
export async function setLogoUrl(businessId: string, logoUrl: string | null, db: Queryable = pool): Promise<string | null> {
  const result = await db.query<{ old_logo_url: string | null }>(
    `UPDATE business_profiles p
        SET logo_url = $2
       FROM (SELECT logo_url AS old_logo_url FROM business_profiles WHERE business_id = $1 FOR UPDATE) old
      WHERE p.business_id = $1
      RETURNING old.old_logo_url`,
    [businessId, logoUrl],
  );
  return result.rows[0]?.old_logo_url ?? null;
}

export async function setPublished(businessId: string, published: boolean, db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE business_profiles
        SET is_published = $2,
            published_at = CASE WHEN $2 THEN COALESCE(published_at, now()) ELSE published_at END
      WHERE business_id = $1`,
    [businessId, published],
  );
}

export async function updateBookingSettings(
  businessId: string,
  settings: BookingSettingsChanges,
  db: Queryable = pool,
): Promise<Business | null> {
  const result = await db.query<BusinessRow>(
    `UPDATE businesses
        SET timezone = $2, slot_interval_minutes = $3, min_notice_hours = $4,
            max_advance_days = $5, cancellation_notice_hours = $6
      WHERE id = $1
      RETURNING *`,
    [
      businessId,
      settings.timezone,
      settings.slotIntervalMinutes,
      settings.minNoticeHours,
      settings.maxAdvanceDays,
      settings.cancellationNoticeHours,
    ],
  );
  return result.rows[0] ? toBusiness(result.rows[0]) : null;
}

/** Replaces all category links of a business with these ones. */
export async function replaceCategoryLinks(businessId: string, categoryIds: string[], db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM business_category_links WHERE business_id = $1', [businessId]);
  await addCategoryLinks(businessId, categoryIds, db);
}

export async function listCategories(businessId: string, db: Queryable = pool): Promise<Category[]> {
  const result = await db.query<{
    id: string; name: string; slug: string; description: string | null; icon: string | null;
    is_active: boolean; sort_order: number; created_at: Date; updated_at: Date;
  }>(
    `SELECT c.*
       FROM categories c
       JOIN business_category_links l ON l.category_id = c.id
      WHERE l.business_id = $1
      ORDER BY c.sort_order, c.name`,
    [businessId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** Everything the go-live checklist needs, in ONE query. */
export async function getGoLiveFacts(businessId: string, db: Queryable = pool): Promise<GoLiveFacts | null> {
  const result = await db.query<{
    email_verified: boolean;
    has_active_subscription: boolean;
    has_description: boolean;
    has_city: boolean;
    category_count: string;
    active_service_count: string;
    bookable_service_count: string;
    working_hours_count: string;
  }>(
    `SELECT
        (u.email_verified_at IS NOT NULL) AS email_verified,
        EXISTS (SELECT 1 FROM subscriptions s
                 WHERE s.business_id = b.id AND s.status IN ('active', 'past_due')) AS has_active_subscription,
        (coalesce(trim(p.description), '') <> '') AS has_description,
        (coalesce(trim(p.city), '') <> '') AS has_city,
        (SELECT count(*) FROM business_category_links l WHERE l.business_id = b.id) AS category_count,
        (SELECT count(*) FROM services sv WHERE sv.business_id = b.id AND sv.is_active) AS active_service_count,
        (SELECT count(*) FROM services sv WHERE sv.business_id = b.id AND sv.is_active AND sv.is_bookable) AS bookable_service_count,
        (SELECT count(*) FROM working_hours w WHERE w.business_id = b.id) AS working_hours_count
       FROM businesses b
       JOIN users u ON u.id = b.owner_user_id
       JOIN business_profiles p ON p.business_id = b.id
      WHERE b.id = $1`,
    [businessId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    emailVerified: row.email_verified,
    hasActiveSubscription: row.has_active_subscription,
    hasDescription: row.has_description,
    hasCity: row.has_city,
    categoryCount: Number(row.category_count),
    activeServiceCount: Number(row.active_service_count),
    bookableServiceCount: Number(row.bookable_service_count),
    workingHoursCount: Number(row.working_hours_count),
  };
}

/**
 * Changes the admin status - but ONLY if the current status is one of `change.from`.
 * Doing the check inside the UPDATE means two admins clicking at once cannot cause a wrong change.
 * Returns null if the business does not exist or is in another status.
 */
export async function changeStatus(businessId: string, change: BusinessStatusChange, db: Queryable = pool): Promise<Business | null> {
  const result = await db.query<BusinessRow>(
    `UPDATE businesses
        SET status = $2,
            status_reason = $3,
            approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE approved_at END,
            approved_by = CASE WHEN $2 = 'approved' THEN $4::uuid ELSE approved_by END
      WHERE id = $1 AND status = ANY($5::text[])
      RETURNING *`,
    [businessId, change.to, change.reason, change.adminUserId, change.from],
  );
  return result.rows[0] ? toBusiness(result.rows[0]) : null;
}
