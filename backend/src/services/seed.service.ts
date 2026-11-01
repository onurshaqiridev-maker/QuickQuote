/**
 * Inserts the starting data: categories, subscription plans and the first admin account.
 * Safe to run many times: existing rows are skipped, never overwritten.
 */
import * as categoryRepository from '../data/repositories/category.repository';
import * as planRepository from '../data/repositories/plan.repository';
import * as userRepository from '../data/repositories/user.repository';
import type { CategorySeed, PlanSeed, SeedAdmin, SeedSummary } from '../models/dto/seed.dto';
import { hashPassword } from './password.service';

export async function seedBaseData(data: {
  categories: CategorySeed[];
  plans: PlanSeed[];
  admin?: SeedAdmin;
}): Promise<SeedSummary> {
  let categoriesCreated = 0;
  for (const category of data.categories) {
    if (await categoryRepository.insertIfMissing(category)) categoriesCreated += 1;
  }

  let plansCreated = 0;
  for (const plan of data.plans) {
    if (await planRepository.insertIfMissing(plan)) plansCreated += 1;
  }

  let adminCreated = false;
  if (data.admin && !(await userRepository.findByEmail(data.admin.email))) {
    await userRepository.insert({
      email: data.admin.email,
      passwordHash: await hashPassword(data.admin.password),
      fullName: data.admin.fullName,
      phone: null,
      role: 'admin',
      emailVerified: true,
    });
    adminCreated = true;
  }

  return { categoriesCreated, plansCreated, adminCreated };
}
