/**
 * Turn entities (database rows) into response models (what the API returns).
 * This is where we make sure private fields - like password hashes - never leave the backend.
 */
import type { Business, BusinessProfile } from '../models/entities/business.entity';
import type { Category } from '../models/entities/category.entity';
import type { EmailJob } from '../models/entities/email-job.entity';
import type { User } from '../models/entities/user.entity';
import type { CategoryResponse } from '../models/responses/category.response';
import type { EmailJobResponse } from '../models/responses/email-job.response';
import type { BusinessSummaryResponse, UserResponse } from '../models/responses/user.response';

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toBusinessSummaryResponse(business: Business, profile: BusinessProfile): BusinessSummaryResponse {
  return {
    id: business.id,
    status: business.status,
    slug: profile.slug,
    displayName: profile.displayName,
    isPublished: profile.isPublished,
  };
}

export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
  };
}

export function toEmailJobResponse(job: EmailJob): EmailJobResponse {
  return {
    id: job.id,
    toEmail: job.toEmail,
    template: job.template,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt.toISOString(),
    lastError: job.lastError,
    sentAt: job.sentAt ? job.sentAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
  };
}
