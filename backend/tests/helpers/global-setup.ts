/**
 * Runs once before all tests: wipes the TEST database and applies every migration,
 * so each test run starts from the real, current schema.
 */
import path from 'node:path';
import { runner } from 'node-pg-migrate';
import { Client } from 'pg';

export default async function setup(): Promise<void> {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgres://quickquote:quickquote@localhost:5432/quickquote_test';
  if (!/test/i.test(databaseUrl)) {
    throw new Error(`Refusing to wipe "${databaseUrl}": the test database name must contain "test".`);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();

  await runner({
    databaseUrl,
    dir: path.resolve(__dirname, '../../migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => undefined,
  });
}
