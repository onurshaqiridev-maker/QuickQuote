import { DomainError } from '../../models/errors';
import type { NewUser } from '../../models/dto/user.dto';
import type { User } from '../../models/entities/user.entity';
import { pool, type Queryable } from '../db';
import { isPgError, PG_ERROR } from '../pg-errors';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  role: User['role'];
  status: User['status'];
  status_reason: string | null;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  password_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    statusReason: row.status_reason,
    emailVerifiedAt: row.email_verified_at,
    lastLoginAt: row.last_login_at,
    passwordChangedAt: row.password_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findById(id: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function findByEmail(email: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function insert(user: NewUser, db: Queryable = pool): Promise<User> {
  try {
    const result = await db.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, phone, role, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::boolean THEN now() ELSE NULL END)
       RETURNING *`,
      [user.email.toLowerCase(), user.passwordHash, user.fullName, user.phone, user.role, user.emailVerified ?? false],
    );
    return toUser(result.rows[0]);
  } catch (error) {
    // Two people registering the same email at the same moment: the database decides.
    if (isPgError(error, PG_ERROR.UNIQUE_VIOLATION, 'users_email_unique')) {
      throw new DomainError('EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function updateProfile(
  id: string,
  changes: { fullName: string; phone: string | null },
  db: Queryable = pool,
): Promise<User | null> {
  const result = await db.query<UserRow>(
    'UPDATE users SET full_name = $2, phone = $3 WHERE id = $1 RETURNING *',
    [id, changes.fullName, changes.phone],
  );
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

/** Saves a new password. `changedAt` ends every login session that started before it. */
export async function updatePasswordHash(id: string, passwordHash: string, changedAt: Date, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET password_hash = $2, password_changed_at = $3 WHERE id = $1', [id, passwordHash, changedAt]);
}

export async function markEmailVerified(id: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<UserRow>(
    'UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1 RETURNING *',
    [id],
  );
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function updateLastLogin(id: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
}
