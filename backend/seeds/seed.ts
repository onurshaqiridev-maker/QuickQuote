/**
 * Seed script: fills the database with starting data.   npm run seed
 *
 * - 12 business categories
 * - 3 subscription plans (Starter, Professional, Premium)
 * - the first admin account (from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *
 * Safe to run many times: rows that already exist are skipped.
 * Like the worker, this is an entry point: it calls a service, never SQL directly.
 */
import { env } from '../src/config/env';
import { closePool } from '../src/data/db';
import { seedBaseData } from '../src/services/seed.service';
import { categories } from './data/categories';
import { plans } from './data/plans';

async function main(): Promise<void> {
  const admin =
    env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD
      ? { email: env.SEED_ADMIN_EMAIL.toLowerCase(), password: env.SEED_ADMIN_PASSWORD, fullName: 'Platform Admin' }
      : undefined;

  const summary = await seedBaseData({ categories, plans, admin });

  console.log('Seed finished:');
  console.log(`  categories created: ${summary.categoriesCreated} (of ${categories.length})`);
  console.log(`  plans created:      ${summary.plansCreated} (of ${plans.length})`);
  if (!admin) {
    console.log('  admin:              skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)');
  } else {
    console.log(`  admin:              ${summary.adminCreated ? 'created' : 'already exists'} (${admin.email})`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
