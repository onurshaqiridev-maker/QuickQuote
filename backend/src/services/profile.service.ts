/** The public profile content: details, logo, photos, categories, publishing. */
import { withTransaction } from '../data/db';
import * as businessRepository from '../data/repositories/business.repository';
import * as categoryRepository from '../data/repositories/category.repository';
import * as photoRepository from '../data/repositories/photo.repository';
import type { UploadedFile } from '../models/dto/business.dto';
import { DomainError, NotFoundError, ValidationError } from '../models/errors';
import type {
  ReorderPhotosRequest,
  SetCategoriesRequest,
  UpdateBusinessProfileRequest,
} from '../models/requests/business.requests';
import type { BusinessProfileResponse, PhotoResponse } from '../models/responses/business.response';
import { logActivity } from './activity.service';
import { assertCanPublish, getChecklist } from './business.service';
import { toBusinessProfileResponse, toPhotoResponse } from './mappers';
import { deleteImage, saveImage } from './storage.service';
import { getPlanLimits } from './subscription.service';

export async function getProfile(businessId: string): Promise<BusinessProfileResponse> {
  const [business, profile, categories, photos] = await Promise.all([
    businessRepository.findById(businessId),
    businessRepository.findProfileByBusinessId(businessId),
    businessRepository.listCategories(businessId),
    photoRepository.listByBusiness(businessId),
  ]);
  if (!business || !profile) throw new NotFoundError('Business not found.');
  return toBusinessProfileResponse(business, profile, categories, photos);
}

export async function updateProfile(businessId: string, input: UpdateBusinessProfileRequest): Promise<BusinessProfileResponse> {
  const updated = await businessRepository.updateProfile(businessId, {
    displayName: input.displayName,
    description: input.description ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    websiteUrl: input.websiteUrl ?? null,
    addressLine: input.addressLine ?? null,
    city: input.city ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? null,
  });
  if (!updated) throw new NotFoundError('Business not found.');
  return getProfile(businessId);
}

export async function setCategories(businessId: string, input: SetCategoriesRequest): Promise<BusinessProfileResponse> {
  const active = await categoryRepository.countActiveByIds(input.categoryIds);
  if (active !== input.categoryIds.length) {
    throw new ValidationError([{ field: 'categoryIds', message: 'One or more categories do not exist.' }]);
  }
  await withTransaction((tx) => businessRepository.replaceCategoryLinks(businessId, input.categoryIds, tx));
  return getProfile(businessId);
}

// ---------------------------------------------------------------------------
// Logo and photos
// ---------------------------------------------------------------------------

export async function uploadLogo(businessId: string, file: UploadedFile): Promise<BusinessProfileResponse> {
  const url = await saveImage(`businesses/${businessId}`, file);
  const previousUrl = await businessRepository.setLogoUrl(businessId, url);
  await deleteImage(previousUrl);
  return getProfile(businessId);
}

export async function removeLogo(businessId: string): Promise<BusinessProfileResponse> {
  const previousUrl = await businessRepository.setLogoUrl(businessId, null);
  await deleteImage(previousUrl);
  return getProfile(businessId);
}

export async function addPhoto(businessId: string, file: UploadedFile, caption: string | null): Promise<PhotoResponse> {
  const [limits, count] = await Promise.all([getPlanLimits(businessId), photoRepository.countByBusiness(businessId)]);
  if (count >= limits.maxPhotos) {
    throw new DomainError(
      'PLAN_LIMIT_REACHED',
      `Your plan allows ${limits.maxPhotos} photos. Delete a photo or choose a bigger plan.`,
    );
  }
  const url = await saveImage(`businesses/${businessId}`, file);
  const photo = await photoRepository.insert({ businessId, imageUrl: url, caption });
  return toPhotoResponse(photo);
}

export async function deletePhoto(businessId: string, photoId: string): Promise<void> {
  const photo = await photoRepository.deleteForBusiness(businessId, photoId);
  if (!photo) throw new NotFoundError('Photo not found.');
  await deleteImage(photo.imageUrl);
}

export async function reorderPhotos(businessId: string, input: ReorderPhotosRequest): Promise<PhotoResponse[]> {
  const photos = await photoRepository.listByBusiness(businessId);
  const ownIds = new Set(photos.map((photo) => photo.id));
  if (input.photoIds.length !== photos.length || !input.photoIds.every((id) => ownIds.has(id))) {
    throw new ValidationError([{ field: 'photoIds', message: 'Send every photo of your gallery exactly once.' }]);
  }
  await photoRepository.setOrder(businessId, input.photoIds);
  return (await photoRepository.listByBusiness(businessId)).map(toPhotoResponse);
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function publish(businessId: string, actorUserId: string): Promise<BusinessProfileResponse> {
  assertCanPublish(await getChecklist(businessId));
  await withTransaction(async (tx) => {
    await businessRepository.setPublished(businessId, true, tx);
    await logActivity({ actorUserId, action: 'business.published', entityType: 'business', entityId: businessId }, tx);
  });
  return getProfile(businessId);
}

export async function unpublish(businessId: string, actorUserId: string): Promise<BusinessProfileResponse> {
  await withTransaction(async (tx) => {
    await businessRepository.setPublished(businessId, false, tx);
    await logActivity({ actorUserId, action: 'business.unpublished', entityType: 'business', entityId: businessId }, tx);
  });
  return getProfile(businessId);
}
