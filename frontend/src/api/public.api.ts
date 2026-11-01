import type { ApiResponse, Category, MessageResponse, Plan, PlatformConfig } from '../types/api';
import { api } from './client';

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const publicApi = {
  config: async () => (await api.get<ApiResponse<PlatformConfig>>('/api/config')).data,
  categories: async () => (await api.get<ApiResponse<Category[]>>('/api/categories')).data,
  plans: async () => (await api.get<ApiResponse<Plan[]>>('/api/plans')).data,
  contact: async (input: ContactInput) => (await api.post<ApiResponse<MessageResponse>>('/api/contact', input)).data,
};
