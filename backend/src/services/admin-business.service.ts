/**
 * Admin tools for businesses: list, details, approve / suspend / deactivate / reactivate.
 * Every change is logged and the owner is emailed (through the queue).
 */
import { env } from '../config/env';
import { withTransaction } from '../data/db';
import * as adminBusinessRepository from '../data/repositories/admin-business.repository';
import * as businessRepository from '../data/repositories/business.repository';
import type { AdminBusinessRow } from '../models/dto/admin.dto';
import type { Page } from '../models/dto/page.dto';
import type { BusinessStatus } from '../models/enums';
import { DomainError, NotFoundError } from '../models/errors';
import type { ListBusinessesQuery } from '../models/requests/admin.requests';
import type { AdminBusinessDetail, AdminBusinessListItem, AdminBusinessOwner } from '../models/responses/admin.response';
import { logActivity } from './activity.service';
import { getChecklist } from './business.service';
import { enqueueEmail } from './email/email-queue.service';
import { getProfile } from './profile.service';

function owner(row: AdminBusinessRow): AdminBusinessOwner {
  return { id: row.ownerId, fullName: row.ownerName, email: row.ownerEmail, phone: row.ownerPhone, emailVerified: row.ownerEmailVerified };
}

function toListItem(row: AdminBusinessRow): AdminBusinessListItem {
  return {
    id: row.id,
    displayName: row.displayName,
    slug: row.slug,
    city: row.city,
    status: row.status,
    isPublished: row.isPublished,
    activeServices: row.activeServices,
    owner: owner(row),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listBusinesses(query: ListBusinessesQuery): Promise<Page<AdminBusinessListItem>> {
  const page = await adminBusinessRepository.list(query);
  return { ...page, items: page.items.map(toListItem) };
}

export async function getBusinessDetail(businessId: string): Promise<AdminBusinessDetail> {
  const [row, business] = await Promise.all([adminBusinessRepository.findById(businessId), businessRepository.findById(businessId)]);
  if (!row || !business) throw new NotFoundError('Business not found.');
  const [profile, checklist] = await Promise.all([getProfile(businessId), getChecklist(businessId)]);
  return {
    id: business.id,
    status: business.status,
    statusReason: business.statusReason,
    approvedAt: business.approvedAt ? business.approvedAt.toISOString() : null,
    createdAt: business.createdAt.toISOString(),
    owner: owner(row),
    profile,
    activeServices: row.activeServices,
    checklist,
  };
}

type Action = 'approve' | 'suspend' | 'deactivate' | 'reactivate';

/** Which status each action leads to, and from which statuses it is allowed. */
const TRANSITIONS: Record<Action, { to: BusinessStatus; from: BusinessStatus[]; activity: string }> = {
  approve: { to: 'approved', from: ['pending_review', 'suspended'], activity: 'business.approved' },
  suspend: { to: 'suspended', from: ['pending_review', 'approved'], activity: 'business.suspended' },
  deactivate: { to: 'deactivated', from: ['pending_review', 'approved', 'suspended'], activity: 'business.deactivated' },
  reactivate: { to: 'approved', from: ['deactivated'], activity: 'business.reactivated' },
};

export async function changeBusinessStatus(
  businessId: string,
  action: Action,
  adminUserId: string,
  reason: string | null = null,
): Promise<AdminBusinessDetail> {
  const row = await adminBusinessRepository.findById(businessId);
  if (!row) throw new NotFoundError('Business not found.');
  const rule = TRANSITIONS[action];

  await withTransaction(async (tx) => {
    const updated = await businessRepository.changeStatus(
      businessId,
      { to: rule.to, from: rule.from, reason: rule.to === 'approved' ? null : reason, adminUserId },
      tx,
    );
    if (!updated) {
      throw new DomainError(
        'INVALID_STATUS_TRANSITION',
        `A business that is "${row.status.replace('_', ' ')}" cannot be changed with "${action}".`,
      );
    }
    await logActivity(
      { actorUserId: adminUserId, action: rule.activity, entityType: 'business', entityId: businessId, metadata: reason ? { reason } : {} },
      tx,
    );

    if (rule.to === 'approved') {
      await enqueueEmail(
        {
          to: row.ownerEmail,
          template: 'business_approved',
          payload: {
            fullName: row.ownerName,
            businessName: row.displayName,
            isPublished: row.isPublished,
            profileUrl: new URL(`/businesses/${row.slug}`, env.FRONTEND_URL).toString(),
            dashboardUrl: new URL('/dashboard', env.FRONTEND_URL).toString(),
          },
        },
        tx,
      );
    } else {
      await enqueueEmail(
        {
          to: row.ownerEmail,
          template: 'business_suspended',
          payload: {
            fullName: row.ownerName,
            businessName: row.displayName,
            status: rule.to === 'deactivated' ? 'deactivated' : 'suspended',
            reason: reason ?? '',
            contactUrl: new URL('/contact', env.FRONTEND_URL).toString(),
          },
        },
        tx,
      );
    }
  });

  return getBusinessDetail(businessId);
}
