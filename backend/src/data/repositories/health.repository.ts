import { pool } from '../db';

/**
 * Checks that PostgreSQL answers a trivial query within `timeoutMs`.
 * Returns true (reachable) or false (down, wrong password, too slow...).
 */
export async function ping(timeoutMs: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database did not answer within ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    await Promise.race([pool.query('SELECT 1'), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
