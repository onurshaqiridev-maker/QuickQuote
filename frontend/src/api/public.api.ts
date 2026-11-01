import type { ApiResponse, Category, MessageResponse, Plan } from '../types/api';
import { api } from './client';

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const publicApi = {
  categories: async () => (await api.get<ApiResponse<Category[]>>('/api/categories')).data,
  plans: async () => (await api.get<ApiResponse<Plan[]>>('/api/plans')).data,
  contact: async (input: ContactInput) => (await api.post<ApiResponse<MessageResponse>>('/api/contact', input)).data,
};
