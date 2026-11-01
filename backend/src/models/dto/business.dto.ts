/** Data needed to create a business together with its (unpublished) profile. */
export interface NewBusiness {
  ownerUserId: string;
  timezone: string;
}

export interface NewBusinessProfile {
  businessId: string;
  slug: string;
  displayName: string;
  city: string;
}

/** Profile fields a business owner can edit. */
export interface ProfileChanges {
  displayName: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface BookingSettingsChanges {
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  cancellationNoticeHours: number;
}

/** What a subscription plan allows. maxServices null = unlimited. */
export interface PlanLimits {
  planName: string | null;
  maxServices: number | null;
  maxPhotos: number;
  isFeatured: boolean;
}

/** An uploaded file, handed from the API layer to a service (no HTTP/multer types). */
export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  size: number;
}

/** The facts the go-live checklist is calculated from. */
export interface GoLiveFacts {
  emailVerified: boolean;
  hasActiveSubscription: boolean;
  hasDescription: boolean;
  hasCity: boolean;
  categoryCount: number;
  activeServiceCount: number;
  bookableServiceCount: number;
  workingHoursCount: number;
}
