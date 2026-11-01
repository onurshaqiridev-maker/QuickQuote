/**
 * The PostgreSQL connection pool. A pool keeps a few connections open and reuses them.
 * All connection settings come from environment variables (see config/env.ts).
 *
 * Only the data layer imports this file (plus the entry points, to close the pool on shutdown).
 */
import { Pool, type PoolClient } from 'pg';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Hosted databases often require SSL. rejectUnauthorized=false accepts the provider's certificate.
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: env.DATABASE_POOL_MAX,
  // Do not wait forever when the database is down.
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
});

/**
 * Something that can run SQL: the pool itself, or a transaction.
 * Every repository function accepts one as its last argument (default: the pool).
 */
export type Queryable = Pool | PoolClient;

/**
 * A running database transaction. Services receive it from `withTransaction`
 * and pass it on to repositories - they never write SQL themselves.
 */
export type Transaction = PoolClient;

/**
 * Runs `work` inside a transaction: either ALL its database changes are saved, or NONE.
 * If `work` throws, everything is rolled back and the error is re-thrown.
 */
export async function withTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Closes all connections (used when the program shuts down). */
export async function closePool(): Promise<void> {
  await pool.end();
}
