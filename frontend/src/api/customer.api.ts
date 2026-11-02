import type { ApiListResponse, ApiResponse, CustomerOverview, CustomerQuote, CustomerQuoteTab, CustomerReservation, QuoteDecision } from '../types/api';
import { api } from './client';

export interface BookingInput {
  businessId: string;
  serviceId: string;
  startsAt: string;
  notes: string;
  phone: string;
}

export interface QuoteRequestInput {
  businessId: string;
  /** '' = general request */
  serviceId: string;
  subject: string;
  description: string;
  /** '' or "YYYY-MM-DD" */
  preferredDate: string;
  budgetCents: number | null;
  phone: string;
}

export const customerApi = {
  overview: async () => (await api.get<ApiResponse<CustomerOverview>>('/api/customer/overview')).data,
  reservations: (tab: 'upcoming' | 'past' | 'cancelled', page = 1) =>
    api.get<ApiListResponse<CustomerReservation>>(`/api/customer/reservations?tab=${tab}&page=${page}&pageSize=10`),
  book: async (input: BookingInput) => (await api.post<ApiResponse<CustomerReservation>>('/api/customer/reservations', input)).data,
  cancel: async (id: string, message: string) =>
    (await api.post<ApiResponse<CustomerReservation>>(`/api/customer/reservations/${id}/cancel`, message ? { message } : {})).data,
  quotes: (tab: CustomerQuoteTab, page = 1) => api.get<ApiListResponse<CustomerQuote>>(`/api/customer/quote-requests?tab=${tab}&page=${page}&pageSize=10`),
  requestQuote: async (input: QuoteRequestInput) => (await api.post<ApiResponse<CustomerQuote>>('/api/customer/quote-requests', input)).data,
  decideQuote: async (id: string, decision: QuoteDecision) =>
    (await api.post<ApiResponse<CustomerQuote>>(`/api/customer/quote-requests/${id}/${decision === 'accepted' ? 'accept' : 'decline'}`, {})).data,
};
