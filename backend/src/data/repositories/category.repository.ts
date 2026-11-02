import type { CategoryFields } from '../../models/dto/category.dto';
import type { CategorySeed } from '../../models/dto/seed.dto';
import type { Category } from '../../models/entities/category.entity';
import { ValidationError } from '../../models/errors';
import { pool, type Queryable } from '../db';
import { isPgError, PG_ERROR } from '../pg-errors';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listActive(db: Queryable = pool): Promise<Category[]> {
  const result = await db.query<CategoryRow>(
    'SELECT * FROM categories WHERE is_active = true ORDER BY sort_order, name',
  );
  return result.rows.map(toCategory);
}

/** How many of these ids belong to existing, active categories. */
export async function countActiveByIds(ids: string[], db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    'SELECT count(*) FROM categories WHERE is_active = true AND id = ANY($1::uuid[])',
    [ids],
  );
  return Number(result.rows[0].count);
}

/** Inserts a category unless one with the same slug exists. Returns true if it was created. */
export async function insertIfMissing(category: CategorySeed, db: Queryable = pool): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO categories (name, slug, description, icon, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO NOTHING`,
    [category.name, category.slug, category.description, category.icon, category.sortOrder],
  );
  return (result.rowCount ?? 0) > 0;
}

/** slug -> id, for the given slugs. */
export async function findIdsBySlugs(slugs: string[], db: Queryable = pool): Promise<Map<string, string>> {
  const result = await db.query<{ id: string; slug: string }>('SELECT id, slug FROM categories WHERE slug = ANY($1::text[])', [slugs]);
  return new Map(result.rows.map((row) => [row.slug, row.id]));
}

/** Admin: every category (also inactive ones), with how many businesses use it. */
export async function listAllWithCounts(db: Queryable = pool): Promise<(Category & { businessCount: number })[]> {
  const result = await db.query<CategoryRow & { business_count: string }>(
    `SELECT c.*, (SELECT count(*) FROM business_category_links l WHERE l.category_id = c.id) AS business_count
       FROM categories c
      ORDER BY c.sort_order, c.name`,
  );
  return result.rows.map((row) => ({ ...toCategory(row), businessCount: Number(row.business_count) }));
}

export async function findById(id: string, db: Queryable = pool): Promise<Category | null> {
  const result = await db.query<CategoryRow>('SELECT * FROM categories WHERE id = $1', [id]);
  return result.rows[0] ? toCategory(result.rows[0]) : null;
}

export async function countBusinesses(id: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>('SELECT count(*) FROM business_category_links WHERE category_id = $1', [id]);
  return Number(result.rows[0].count);
}

/** The same name or slug twice is refused by the database; that becomes a friendly field error. */
function duplicateError(error: unknown): never {
  if (isPgError(error, PG_ERROR.UNIQUE_VIOLATION, 'categories_name_unique')) {
    throw new ValidationError([{ field: 'name', message: 'A category with this name already exists.' }]);
  }
  if (isPgError(error, PG_ERROR.UNIQUE_VIOLATION, 'categories_slug_unique')) {
    throw new ValidationError([{ field: 'slug', message: 'Another category already uses this address name.' }]);
  }
  throw error;
}

export async function insert(category: CategoryFields, db: Queryable = pool): Promise<Category> {
  try {
    const result = await db.query<CategoryRow>(
      `INSERT INTO categories (name, slug, description, icon, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [category.name, category.slug, category.description, category.icon, category.sortOrder, category.isActive],
    );
    return toCategory(result.rows[0]);
  } catch (error) {
    duplicateError(error);
  }
}

export async function update(id: string, category: CategoryFields, db: Queryable = pool): Promise<Category | null> {
  try {
    const result = await db.query<CategoryRow>(
      `UPDATE categories SET name = $2, slug = $3, description = $4, icon = $5, sort_order = $6, is_active = $7
        WHERE id = $1 RETURNING *`,
      [id, category.name, category.slug, category.description, category.icon, category.sortOrder, category.isActive],
    );
    return result.rows[0] ? toCategory(result.rows[0]) : null;
  } catch (error) {
    duplicateError(error);
  }
}

/** Deletes a category only if no business uses it (checked inside the DELETE). Returns false otherwise. */
export async function deleteIfUnused(id: string, db: Queryable = pool): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM categories c WHERE c.id = $1 AND NOT EXISTS (SELECT 1 FROM business_category_links l WHERE l.category_id = c.id)',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
