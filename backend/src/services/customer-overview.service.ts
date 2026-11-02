/** The customer's overview page: next appointments and latest quote requests. */
import type { CustomerOverviewResponse } from '../models/responses/reservation.response';
import { getCustomerQuoteSummary } from './quote.service';
import { getCustomerReservationSummary } from './reservation.service';

export async function getCustomerOverview(customerId: string): Promise<CustomerOverviewResponse> {
  const [reservations, quotes] = await Promise.all([getCustomerReservationSummary(customerId), getCustomerQuoteSummary(customerId)]);
  return { ...reservations, quotes };
}
