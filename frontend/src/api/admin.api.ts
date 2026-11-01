import type {
  AdminBusinessDetail,
  AdminBusinessListItem,
  ApiListResponse,
  ApiResponse,
  BusinessStatus,
  EmailJob,
  EmailJobStatus,
  EmailQueueStats,
} from '../types/api';

export type BusinessAction = 'approve' | 'suspend' | 'deactivate' | 'reactivate';
import { api } from './client';

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
};
