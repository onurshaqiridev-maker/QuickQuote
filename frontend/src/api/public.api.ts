import type { ApiListResponse, ApiResponse, BusinessCard, Category, City, MessageResponse, Plan, PlatformConfig, PublicBusiness } from '../types/api';
import { api } from './client';

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface BusinessSearch {
  search?: string;
  category?: string;
  city?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const publicApi = {
  searchBusinesses: (search: BusinessSearch) =>
    api.get<ApiListResponse<BusinessCard>>(`/api/businesses${queryString({ ...search })}`),
  business: async (slug: string) => (await api.get<ApiResponse<PublicBusiness>>(`/api/businesses/${encodeURIComponent(slug)}`)).data,
  cities: async () => (await api.get<ApiResponse<City[]>>('/api/cities')).data,
  config: async () => (await api.get<ApiResponse<PlatformConfig>>('/api/config')).data,
  categories: async () => (await api.get<ApiResponse<Category[]>>('/api/categories')).data,
  plans: async () => (await api.get<ApiResponse<Plan[]>>('/api/plans')).data,
  contact: async (input: ContactInput) => (await api.post<ApiResponse<MessageResponse>>('/api/contact', input)).data,
};
