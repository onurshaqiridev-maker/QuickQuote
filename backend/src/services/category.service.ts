import * as categoryRepository from '../data/repositories/category.repository';
import type { CategoryResponse } from '../models/responses/category.response';
import { toCategoryResponse } from './mappers';

/** Active categories, for filters and the business registration form. */
export async function listActiveCategories(): Promise<CategoryResponse[]> {
  const categories = await categoryRepository.listActive();
  return categories.map(toCategoryResponse);
}
