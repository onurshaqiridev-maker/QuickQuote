/**
 * Runs the SQL migrations in backend/migrations.
 *
 *   npm run migrate:up      apply all new migrations
 *   npm run migrate:down    undo the most recent migration
 *
 * The database address comes from DATABASE_URL (and DATABASE_SSL), like the app itself.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runner } from 'node-pg-migrate';
import { env } from '../src/config/env';

/**
 * The SQL files live in backend/migrations. This script runs from scripts/ (with tsx)
 * or from dist/scripts/ (compiled, in production), so look in both places.
 */
function findMigrationsDir(): string {
  const candidates = [path.resolve(__dirname, '../migrations'), path.resolve(__dirname, '../../migrations')];
  const found = candidates.find((dir) => existsSync(dir));
  if (!found) throw new Error(`Migrations folder not found. Looked in: ${candidates.join(', ')}`);
  return found;
}

export async function runMigrations(direction: 'up' | 'down', databaseUrl = env.DATABASE_URL): Promise<void> {
  await runner({
    databaseUrl: {
      connectionString: databaseUrl,
      ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    },
    dir: findMigrationsDir(),
    direction,
    count: direction === 'down' ? 1 : Infinity,
    migrationsTable: 'pgmigrations',
    // Each migration file runs in its own transaction.
    singleTransaction: false,
    log: (message) => console.log(message),
  });
}

// Only run when called directly (not when imported by the test setup).
if (require.main === module) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  runMigrations(direction)
    .then(() => {
      console.log(`Migrations (${direction}) finished.`);
    })
    .catch((error: unknown) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
    });
}
