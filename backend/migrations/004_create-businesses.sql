-- Up Migration

-- The business ACCOUNT: owner, admin approval status and booking rules.
CREATE TABLE businesses (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id             uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status                    text NOT NULL DEFAULT 'pending_review',
  status_reason             text,
  approved_at               timestamptz,
  approved_by               uuid REFERENCES users (id) ON DELETE SET NULL,
  timezone                  text NOT NULL DEFAULT 'UTC',
  slot_interval_minutes     integer NOT NULL DEFAULT 30,
  min_notice_hours          integer NOT NULL DEFAULT 2,
  max_advance_days          integer NOT NULL DEFAULT 60,
  cancellation_notice_hours integer NOT NULL DEFAULT 24,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- One business per owner account.
  CONSTRAINT businesses_owner_unique UNIQUE (owner_user_id),
  CONSTRAINT businesses_status_check
    CHECK (status IN ('pending_review', 'approved', 'suspended', 'deactivated')),
  CONSTRAINT businesses_slot_interval_check CHECK (slot_interval_minutes IN (10, 15, 20, 30, 45, 60)),
  CONSTRAINT businesses_min_notice_check CHECK (min_notice_hours BETWEEN 0 AND 168),
  CONSTRAINT businesses_max_advance_check CHECK (max_advance_days BETWEEN 1 AND 365),
  CONSTRAINT businesses_cancellation_notice_check CHECK (cancellation_notice_hours BETWEEN 0 AND 168)
);
CREATE INDEX businesses_status_idx ON businesses (status);
CREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The PUBLIC face of a business (exactly one per business).
CREATE TABLE business_profiles (
  business_id   uuid PRIMARY KEY REFERENCES businesses (id) ON DELETE CASCADE,
  slug          text NOT NULL,
  display_name  text NOT NULL,
  description   text,
  logo_url      text,
  contact_email text,
  contact_phone text,
  website_url   text,
  address_line  text,
  city          text,
  postal_code   text,
  country       text,
  is_published  boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_profiles_slug_unique UNIQUE (slug),
  CONSTRAINT business_profiles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT business_profiles_display_name_length CHECK (char_length(display_name) BETWEEN 2 AND 100),
  CONSTRAINT business_profiles_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT business_profiles_country_length CHECK (country IS NULL OR char_length(country) = 2)
);
CREATE INDEX business_profiles_city_idx ON business_profiles (lower(city));
CREATE INDEX business_profiles_is_published_idx ON business_profiles (is_published);
CREATE INDEX business_profiles_display_name_trgm_idx ON business_profiles USING gin (display_name gin_trgm_ops);
CREATE TRIGGER business_profiles_set_updated_at BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Many-to-many: businesses <-> categories.
CREATE TABLE business_category_links (
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, category_id)
);
CREATE INDEX business_category_links_category_idx ON business_category_links (category_id);

CREATE TABLE business_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  caption     text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_photos_caption_length CHECK (caption IS NULL OR char_length(caption) <= 200)
);
CREATE INDEX business_photos_business_idx ON business_photos (business_id, sort_order);

-- Down Migration

DROP TABLE IF EXISTS business_photos;
DROP TABLE IF EXISTS business_category_links;
DROP TABLE IF EXISTS business_profiles;
DROP TABLE IF EXISTS businesses;
