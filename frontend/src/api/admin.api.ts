import type { ApiListResponse, ApiResponse, EmailJob, EmailJobStatus, EmailQueueStats } from '../types/api';
import { api } from './client';

export const adminApi = {
  emailQueueStats: async () => (await api.get<ApiResponse<EmailQueueStats>>('/api/admin/email-jobs/stats')).data,
  emailJobs: (status?: EmailJobStatus, page = 1) =>
    api.get<ApiListResponse<EmailJob>>(`/api/admin/email-jobs?page=${page}&pageSize=10${status ? `&status=${status}` : ''}`),
  retryEmailJob: async (id: string) => (await api.post<ApiResponse<EmailJob>>(`/api/admin/email-jobs/${id}/retry`)).data,
};
