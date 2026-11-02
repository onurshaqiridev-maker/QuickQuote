/**
 * Admin tools for user accounts: list, details, suspend and reactivate.
 * A suspended user cannot log in, and is logged out on their next request (the session check reads the status).
 * A suspended business owner's business also disappears from the website (see public-business.repository.ts).
 */
import { withTransaction } from '../data/db';
import * as adminUserRepository from '../data/repositories/admin-user.repository';
import type { AdminUserRow } from '../models/dto/admin.dto';
import type { Page } from '../models/dto/page.dto';
import { DomainError, ForbiddenError, NotFoundError } from '../models/errors';
import type { ListUsersQuery } from '../models/requests/admin.requests';
import type { AdminUserDetail, AdminUserListItem } from '../models/responses/admin.response';
import { logActivity } from './activity.service';

function toListItem(row: AdminUserRow): AdminUserListItem {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}

function toDetail(row: AdminUserRow): AdminUserDetail {
  return {
    ...toListItem(row),
    statusReason: row.statusReason,
    counts: { reservations: row.reservationCount, quoteRequests: row.quoteCount },
    business: row.business,
  };
}

export async function listUsers(query: ListUsersQuery): Promise<Page<AdminUserListItem>> {
  const page = await adminUserRepository.list(query);
  return { ...page, items: page.items.map(toListItem) };
}

export async function getUser(id: string): Promise<AdminUserDetail> {
  const row = await adminUserRepository.findById(id);
  if (!row) throw new NotFoundError('User not found.');
  return toDetail(row);
}

/** Blocks a customer or business owner. Administrators cannot be suspended here (also not yourself). */
export async function suspendUser(adminUserId: string, id: string, reason: string): Promise<AdminUserDetail> {
  const row = await adminUserRepository.findById(id);
  if (!row) throw new NotFoundError('User not found.');
  if (row.role === 'admin') throw new ForbiddenError('Administrator accounts cannot be suspended here.');

  await withTransaction(async (tx) => {
    const changed = await adminUserRepository.changeStatus(id, { to: 'suspended', from: ['active'], reason }, tx);
    if (!changed) throw new DomainError('INVALID_STATUS_TRANSITION', `This account is "${row.status}" and cannot be suspended.`);
    await logActivity({ actorUserId: adminUserId, action: 'user.suspended', entityType: 'user', entityId: id, metadata: { reason } }, tx);
  });
  return getUser(id);
}

export async function reactivateUser(adminUserId: string, id: string): Promise<AdminUserDetail> {
  const row = await adminUserRepository.findById(id);
  if (!row) throw new NotFoundError('User not found.');

  await withTransaction(async (tx) => {
    const changed = await adminUserRepository.changeStatus(id, { to: 'active', from: ['suspended'], reason: null }, tx);
    if (!changed) throw new DomainError('INVALID_STATUS_TRANSITION', `This account is "${row.status}" and cannot be reactivated.`);
    await logActivity({ actorUserId: adminUserId, action: 'user.reactivated', entityType: 'user', entityId: id }, tx);
  });
  return getUser(id);
}
