import type { ApiResponse, AuthData, MessageResponse, User } from '../types/api';
import { api } from './client';

export interface RegisterCustomerInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterBusinessInput extends RegisterCustomerInput {
  businessName: string;
  city: string;
  timezone: string;
  categoryIds: string[];
}

export const authApi = {
  me: async () => (await api.get<ApiResponse<AuthData>>('/api/auth/me')).data,
  login: async (email: string, password: string) =>
    (await api.post<ApiResponse<AuthData>>('/api/auth/login', { email, password })).data,
  logout: () => api.post<void>('/api/auth/logout'),
  registerCustomer: async (input: RegisterCustomerInput) =>
    (await api.post<ApiResponse<AuthData>>('/api/auth/register/customer', input)).data,
  registerBusiness: async (input: RegisterBusinessInput) =>
    (await api.post<ApiResponse<AuthData>>('/api/auth/register/business', input)).data,
  verifyEmail: async (token: string) =>
    (await api.post<ApiResponse<{ user: User }>>('/api/auth/verify-email', { token })).data,
  resendVerification: async () =>
    (await api.post<ApiResponse<MessageResponse>>('/api/auth/resend-verification')).data,
  forgotPassword: async (email: string) =>
    (await api.post<ApiResponse<MessageResponse>>('/api/auth/forgot-password', { email })).data,
  resetPassword: async (token: string, newPassword: string) =>
    (await api.post<ApiResponse<MessageResponse>>('/api/auth/reset-password', { token, newPassword })).data,
};

export const accountApi = {
  updateProfile: async (input: { fullName: string; phone?: string }) =>
    (await api.put<ApiResponse<{ user: User }>>('/api/account/profile', input)).data,
  changePassword: async (currentPassword: string, newPassword: string) =>
    (await api.post<ApiResponse<MessageResponse>>('/api/account/change-password', { currentPassword, newPassword })).data,
};
