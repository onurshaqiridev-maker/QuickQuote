import type { Request, Response } from 'express';
import type { UploadedFile } from '../../../models/dto/business.dto';
import { ValidationError } from '../../../models/errors';
import { idParamsSchema } from '../../../models/requests/common.requests';
import {
  photoUploadSchema,
  reorderPhotosSchema,
  setCategoriesSchema,
  updateBusinessProfileSchema,
} from '../../../models/requests/business.requests';
import * as profileService from '../../../services/profile.service';
import { currentUser } from '../../middleware/authenticate';
import { currentBusinessId } from '../../middleware/load-business';
import { sendData } from '../../responses';
import { parseRequest } from '../../validation';

/** Turns multer's file into a plain object for the service (services know nothing about HTTP). */
function uploadedFile(req: Request): UploadedFile {
  if (!req.file) throw new ValidationError([{ field: 'file', message: 'Please choose an image to upload.' }]);
  return { buffer: req.file.buffer, originalName: req.file.originalname, size: req.file.size };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  sendData(res, await profileService.getProfile(currentBusinessId(req)));
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const input = parseRequest(updateBusinessProfileSchema, req.body);
  sendData(res, await profileService.updateProfile(currentBusinessId(req), input));
}

export async function setCategories(req: Request, res: Response): Promise<void> {
  const input = parseRequest(setCategoriesSchema, req.body);
  sendData(res, await profileService.setCategories(currentBusinessId(req), input));
}

export async function uploadLogo(req: Request, res: Response): Promise<void> {
  sendData(res, await profileService.uploadLogo(currentBusinessId(req), uploadedFile(req)));
}

export async function removeLogo(req: Request, res: Response): Promise<void> {
  sendData(res, await profileService.removeLogo(currentBusinessId(req)));
}

export async function addPhoto(req: Request, res: Response): Promise<void> {
  const file = uploadedFile(req);
  const { caption } = parseRequest(photoUploadSchema, req.body);
  sendData(res, await profileService.addPhoto(currentBusinessId(req), file, caption ?? null), 201);
}

export async function reorderPhotos(req: Request, res: Response): Promise<void> {
  const input = parseRequest(reorderPhotosSchema, req.body);
  sendData(res, await profileService.reorderPhotos(currentBusinessId(req), input));
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  await profileService.deletePhoto(currentBusinessId(req), id);
  res.status(204).end();
}

export async function publish(req: Request, res: Response): Promise<void> {
  sendData(res, await profileService.publish(currentBusinessId(req), currentUser(req).id));
}

export async function unpublish(req: Request, res: Response): Promise<void> {
  sendData(res, await profileService.unpublish(currentBusinessId(req), currentUser(req).id));
}
