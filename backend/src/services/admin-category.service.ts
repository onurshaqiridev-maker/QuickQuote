/**
 * Admin tools for categories: list (with usage), create, edit, delete.
 * A category that businesses use cannot be deleted; it can be switched off instead
 * (then it disappears from filters and forms, but businesses keep it).
 * Every change keeps the category's name in the log, so the feed still reads well after a delete.
 */
import * as categoryRepository from '../data/repositories/category.repository';
import type { CategoryFields } from '../models/dto/category.dto';
import type { Category } from '../models/entities/category.entity';
import { DomainError, NotFoundError, ValidationError } from '../models/errors';
import type { CategoryInput } from '../models/requests/admin.requests';
import type { AdminCategoryResponse } from '../models/responses/admin.response';
import { logActivity } from './activity.service';
import { slugify } from './auth.service';

function toResponse(category: Category, businessCount: number): AdminCategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    businessCount,
  };
}

function toFields(input: CategoryInput): CategoryFields {
  // The address name is made from the name, unless the name has no letters or numbers to use.
  if (!input.slug && !/[a-z0-9]/i.test(input.name.normalize('NFKD'))) {
    throw new ValidationError([{ field: 'slug', message: 'Please enter an address name, e.g. "pet-care".' }]);
  }
  return {
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    description: input.description ?? null,
    icon: input.icon ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };
}

export async function listCategories(): Promise<AdminCategoryResponse[]> {
  const categories = await categoryRepository.listAllWithCounts();
  return categories.map((category) => toResponse(category, category.businessCount));
}

export async function createCategory(adminUserId: string, input: CategoryInput): Promise<AdminCategoryResponse> {
  const category = await categoryRepository.insert(toFields(input));
  await logActivity({ actorUserId: adminUserId, action: 'category.created', entityType: 'category', entityId: category.id, metadata: { name: category.name } });
  return toResponse(category, 0);
}

export async function updateCategory(adminUserId: string, id: string, input: CategoryInput): Promise<AdminCategoryResponse> {
  const category = await categoryRepository.update(id, toFields(input));
  if (!category) throw new NotFoundError('Category not found.');
  await logActivity({ actorUserId: adminUserId, action: 'category.updated', entityType: 'category', entityId: id, metadata: { name: category.name } });
  return toResponse(category, await categoryRepository.countBusinesses(id));
}

export async function deleteCategory(adminUserId: string, id: string): Promise<void> {
  const category = await categoryRepository.findById(id);
  if (!category) throw new NotFoundError('Category not found.');
  if (!(await categoryRepository.deleteIfUnused(id))) {
    const count = await categoryRepository.countBusinesses(id);
    throw new DomainError(
      'CATEGORY_IN_USE',
      `"${category.name}" is used by ${count} business${count === 1 ? '' : 'es'}. Switch it off instead, so it is no longer offered.`,
    );
  }
  await logActivity({ actorUserId: adminUserId, action: 'category.deleted', entityType: 'category', entityId: id, metadata: { name: category.name } });
}
