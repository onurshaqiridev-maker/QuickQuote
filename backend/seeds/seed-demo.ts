/**
 * Demo data for DEVELOPMENT:   npm run seed:demo   (run `npm run seed` first)
 *
 * Creates 8 approved demo businesses (Berlin, Munich, Hamburg, Cologne) with logos, photos,
 * services and working hours, 1 business waiting for admin approval, 3 demo customers and 5 quote requests.
 * All demo accounts use the password printed at the end. Refuses to run in production.
 */
import { env } from '../src/config/env';
import { closePool } from '../src/data/db';
import { seedDemoData } from '../src/services/demo-seed.service';
import { DEMO_PASSWORD, demoBusinesses, demoCustomers, demoQuotes } from './data/demo';

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    console.error('seed:demo refuses to run with NODE_ENV=production (it creates fake businesses).');
    process.exitCode = 1;
    return;
  }
  const summary = await seedDemoData({ businesses: demoBusinesses, customers: demoCustomers, quotes: demoQuotes, password: DEMO_PASSWORD });
  console.log('Demo seed finished:');
  console.log(`  businesses created: ${summary.businessesCreated}`);
  console.log(`  customers created:  ${summary.customersCreated}`);
  console.log(`  quote requests:     ${summary.quotesCreated}`);
  console.log(`  already existed:    ${summary.skipped}`);
  console.log('');
  console.log(`  Demo password for every demo account: ${DEMO_PASSWORD}`);
  console.log('  Business owner example: bella.demo@example.com');
  console.log('  Customer example:       sara.demo@example.com');
}

main()
  .catch((error: unknown) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
