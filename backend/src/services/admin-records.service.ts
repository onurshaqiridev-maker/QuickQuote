/** Admin: read-only lists of all reservations and all quote requests on the platform. */
import * as quoteRepository from '../data/repositories/quote.repository';
import * as reservationRepository from '../data/repositories/reservation.repository';
import type { Page } from '../models/dto/page.dto';
import type { AdminQuotesQuery, AdminReservationsQuery } from '../models/requests/admin.requests';
import type { AdminQuoteResponse, AdminReservationResponse } from '../models/responses/admin.response';
import { toBusinessQuoteResponse } from './quote.service';
import { toBusinessResponse } from './reservation.service';

export async function listReservations(query: AdminReservationsQuery): Promise<Page<AdminReservationResponse>> {
  const page = await reservationRepository.listForAdmin(query);
  const now = new Date();
  return {
    ...page,
    items: page.items.map((r) => ({
      ...toBusinessResponse(r, now),
      business: { id: r.businessId, slug: r.businessSlug, displayName: r.businessName },
    })),
  };
}

export async function listQuoteRequests(query: AdminQuotesQuery): Promise<Page<AdminQuoteResponse>> {
  const page = await quoteRepository.listForAdmin(query);
  return {
    ...page,
    items: page.items.map((q) => ({
      ...toBusinessQuoteResponse(q),
      business: { id: q.businessId, slug: q.businessSlug, displayName: q.businessName },
    })),
  };
}
