/**
 * TypeScript types that match what the backend API returns.
 * (They mirror backend/src/models/responses.)
 */

export type UserRole = 'customer' | 'business_owner' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type BusinessStatus = 'pending_review' | 'approved' | 'suspended' | 'deactivated';
export type EmailJobStatus = 'pending' | 'sent' | 'failed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface BusinessSummary {
  id: string;
  status: BusinessStatus;
  slug: string;
  displayName: string;
  isPublished: boolean;
}

export interface AuthData {
  user: User;
  business?: BusinessSummary;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingInterval: 'month';
  maxServices: number | null;
  maxPhotos: number;
  isFeatured: boolean;
}

export interface EmailJob {
  id: string;
  toEmail: string;
  template: string;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailQueueStats {
  pending: number;
  sent: number;
  failed: number;
}

/** Every successful API response: { data } (lists also have meta). */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface MessageResponse {
  message: string;
}

export interface FieldErrorDetail {
  field: string;
  message: string;
}
