import type { ApiListResponse, ApiResponse, CustomerOverview, CustomerReservation } from '../types/api';
import { api } from './client';

export interface BookingInput {
  businessId: string;
  serviceId: string;
  startsAt: string;
  notes: string;
  phone: string;
}

export const customerApi = {
  overview: async () => (await api.get<ApiResponse<CustomerOverview>>('/api/customer/overview')).data,
  reservations: (tab: 'upcoming' | 'past' | 'cancelled', page = 1) =>
    api.get<ApiListResponse<CustomerReservation>>(`/api/customer/reservations?tab=${tab}&page=${page}&pageSize=10`),
  book: async (input: BookingInput) => (await api.post<ApiResponse<CustomerReservation>>('/api/customer/reservations', input)).data,
  cancel: async (id: string, message: string) =>
    (await api.post<ApiResponse<CustomerReservation>>(`/api/customer/reservations/${id}/cancel`, message ? { message } : {})).data,
};
