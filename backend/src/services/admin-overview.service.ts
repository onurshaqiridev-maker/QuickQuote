/** The admin overview: platform numbers and the activity feed. */
import { env } from '../config/env';
import * as adminOverviewRepository from '../data/repositories/admin-overview.repository';
import * as publicBusinessRepository from '../data/repositories/public-business.repository';
import type { Page, PageQuery } from '../models/dto/page.dto';
import type { AdminActivityItem, AdminStats } from '../models/responses/admin.response';

export async function getStats(): Promise<AdminStats> {
  const [counts, visible] = await Promise.all([adminOverviewRepository.counts(), publicBusinessRepository.countVisible(env.SUBSCRIPTIONS_REQUIRED)]);
  return {
    users: { customers: counts.customers, businessOwners: counts.businessOwners, suspended: counts.suspendedUsers },
    businesses: { ...counts.businesses, visible },
    reservations: { createdThisWeek: counts.reservationsThisWeek, pending: counts.pendingReservations },
    quotes: { createdThisWeek: counts.quotesThisWeek, open: counts.openQuotes },
  };
}

export async function listActivity(page: PageQuery): Promise<Page<AdminActivityItem>> {
  const result = await adminOverviewRepository.listActivity(page);
  return { ...result, items: result.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })) };
}
