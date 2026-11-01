import type { CategorySeed } from '../../models/dto/seed.dto';
import type { Category } from '../../models/entities/category.entity';
import { pool, type Queryable } from '../db';

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
