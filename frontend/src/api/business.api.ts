import type {
  ApiResponse,
  BlockedTime,
  BookingSettings,
  BusinessOverview,
  BusinessProfile,
  BusinessReservation,
  ApiListResponse,
  Offering,
  Photo,
  PriceType,
  WorkingHoursRange,
} from '../types/api';
import { api } from './client';

export interface ProfileInput {
  displayName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OfferingInput {
  name: string;
  description: string;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  isBookable: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

const data = <T>(promise: Promise<ApiResponse<T>>) => promise.then((response) => response.data);

function fileForm(file: File, extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.append('file', file);
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return form;
}

export const businessApi = {
  overview: () => data(api.get<ApiResponse<BusinessOverview>>('/api/business/overview')),

  profile: () => data(api.get<ApiResponse<BusinessProfile>>('/api/business/profile')),
  updateProfile: (input: ProfileInput) => data(api.put<ApiResponse<BusinessProfile>>('/api/business/profile', input)),
  setCategories: (categoryIds: string[]) => data(api.put<ApiResponse<BusinessProfile>>('/api/business/categories', { categoryIds })),
  uploadLogo: (file: File) => data(api.upload<ApiResponse<BusinessProfile>>('/api/business/profile/logo', fileForm(file))),
  removeLogo: () => data(api.delete<ApiResponse<BusinessProfile>>('/api/business/profile/logo')),
  addPhoto: (file: File, caption: string) => data(api.upload<ApiResponse<Photo>>('/api/business/photos', fileForm(file, { caption }))),
  reorderPhotos: (photoIds: string[]) => data(api.put<ApiResponse<Photo[]>>('/api/business/photos/order', { photoIds })),
  deletePhoto: (id: string) => api.delete<void>(`/api/business/photos/${id}`),
  publish: () => data(api.post<ApiResponse<BusinessProfile>>('/api/business/profile/publish')),
  unpublish: () => data(api.post<ApiResponse<BusinessProfile>>('/api/business/profile/unpublish')),

  services: () => data(api.get<ApiResponse<Offering[]>>('/api/business/services')),
  createService: (input: OfferingInput) => data(api.post<ApiResponse<Offering>>('/api/business/services', input)),
  updateService: (id: string, input: OfferingInput) => data(api.put<ApiResponse<Offering>>(`/api/business/services/${id}`, input)),
  archiveService: (id: string) => data(api.delete<ApiResponse<Offering>>(`/api/business/services/${id}`)),

  workingHours: () => data(api.get<ApiResponse<WorkingHoursRange[]>>('/api/business/working-hours')),
  saveWorkingHours: (ranges: WorkingHoursRange[]) => data(api.put<ApiResponse<WorkingHoursRange[]>>('/api/business/working-hours', { ranges })),
  blockedTimes: () => data(api.get<ApiResponse<BlockedTime[]>>('/api/business/blocked-times')),
  addBlockedTime: (input: { startsAt: string; endsAt: string; reason: string }) =>
    data(api.post<ApiResponse<BlockedTime>>('/api/business/blocked-times', input)),
  deleteBlockedTime: (id: string) => api.delete<void>(`/api/business/blocked-times/${id}`),

  reservations: (tab: 'pending' | 'upcoming' | 'past' | 'all', page = 1) =>
    api.get<ApiListResponse<BusinessReservation>>(`/api/business/reservations?tab=${tab}&page=${page}&pageSize=20`),
  reservationAction: (id: string, action: 'confirm' | 'reject' | 'cancel' | 'complete', message?: string) =>
    data(api.post<ApiResponse<BusinessReservation>>(`/api/business/reservations/${id}/${action}`, message ? { message } : {})),

  settings: () => data(api.get<ApiResponse<BookingSettings>>('/api/business/settings')),
  saveSettings: (input: BookingSettings) => data(api.put<ApiResponse<BookingSettings>>('/api/business/settings', input)),
};
