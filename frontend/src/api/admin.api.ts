import type {
  AdminActivityItem,
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminCategory,
  AdminQuote,
  AdminReservation,
  AdminStats,
  AdminUserDetail,
  AdminUserListItem,
  ApiListResponse,
  ApiResponse,
  BusinessStatus,
  CategoryInput,
  EmailJob,
  EmailJobStatus,
  EmailQueueStats,
} from '../types/api';
import { api } from './client';

export type BusinessAction = 'approve' | 'suspend' | 'deactivate' | 'reactivate';

/** Builds "?page=1&pageSize=20&status=..." and leaves out empty filters. */
function listQuery(filter: Record<string, string | number | undefined>, pageSize = 20): string {
  const query = new URLSearchParams({ page: String(filter.page ?? 1), pageSize: String(pageSize) });
  for (const [key, value] of Object.entries(filter)) {
    if (key !== 'page' && value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export const adminApi = {
  businesses: (filter: { status?: BusinessStatus; search?: string; page?: number }) => {
    const query = new URLSearchParams({ page: String(filter.page ?? 1), pageSize: '20' });
    if (filter.status) query.set('status', filter.status);
    if (filter.search) query.set('search', filter.search);
    return api.get<ApiListResponse<AdminBusinessListItem>>(`/api/admin/businesses?${query}`);
  },
  business: async (id: string) => (await api.get<ApiResponse<AdminBusinessDetail>>(`/api/admin/businesses/${id}`)).data,
  changeBusinessStatus: async (id: string, action: BusinessAction, reason?: string) =>
    (await api.post<ApiResponse<AdminBusinessDetail>>(`/api/admin/businesses/${id}/${action}`, reason ? { reason } : {})).data,
  emailQueueStats: async () => (await api.get<ApiResponse<EmailQueueStats>>('/api/admin/email-jobs/stats')).data,
  emailJobs: (status?: EmailJobStatus, page = 1) =>
    api.get<ApiListResponse<EmailJob>>(`/api/admin/email-jobs?page=${page}&pageSize=10${status ? `&status=${status}` : ''}`),
  retryEmailJob: async (id: string) => (await api.post<ApiResponse<EmailJob>>(`/api/admin/email-jobs/${id}/retry`)).data,

  stats: async () => (await api.get<ApiResponse<AdminStats>>('/api/admin/stats')).data,
  activity: (page = 1) => api.get<ApiListResponse<AdminActivityItem>>(`/api/admin/activity?${listQuery({ page }, 15)}`),

  users: (filter: { role?: string; status?: string; search?: string; page?: number }) =>
    api.get<ApiListResponse<AdminUserListItem>>(`/api/admin/users?${listQuery(filter)}`),
  user: async (id: string) => (await api.get<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}`)).data,
  suspendUser: async (id: string, reason: string) => (await api.post<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}/suspend`, { reason })).data,
  reactivateUser: async (id: string) => (await api.post<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}/reactivate`, {})).data,

  reservations: (filter: { status?: string; search?: string; from?: string; to?: string; page?: number }) =>
    api.get<ApiListResponse<AdminReservation>>(`/api/admin/reservations?${listQuery(filter)}`),
  quotes: (filter: { status?: string; search?: string; page?: number }) =>
    api.get<ApiListResponse<AdminQuote>>(`/api/admin/quote-requests?${listQuery(filter)}`),

  categories: async () => (await api.get<ApiResponse<AdminCategory[]>>('/api/admin/categories')).data,
  createCategory: async (input: CategoryInput) => (await api.post<ApiResponse<AdminCategory>>('/api/admin/categories', input)).data,
  updateCategory: async (id: string, input: CategoryInput) => (await api.put<ApiResponse<AdminCategory>>(`/api/admin/categories/${id}`, input)).data,
  deleteCategory: (id: string) => api.delete<void>(`/api/admin/categories/${id}`),
};
