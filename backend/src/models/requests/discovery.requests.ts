import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

export const searchBusinessesQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100, 'Search text is too long.').optional()),
  category: z.preprocess(emptyToUndefined, z.string().regex(/^[a-z0-9-]{1,60}$/, 'Unknown category.').optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(100, 'City is too long.').optional()),
  featured: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type SearchBusinessesQuery = z.infer<typeof searchBusinessesQuerySchema>;

export const slugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Unknown business.').max(80),
});
