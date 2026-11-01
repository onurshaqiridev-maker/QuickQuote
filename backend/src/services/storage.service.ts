/**
 * Saves and deletes uploaded images.
 *
 * Files go to UPLOAD_DIR on the server's disk and are served at /uploads/... by the API.
 * Only this file knows WHERE files are stored, so moving to cloud storage (S3) later
 * means changing only this file.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { UploadedFile } from '../models/dto/business.dto';
import { ValidationError } from '../models/errors';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const PUBLIC_PREFIX = '/uploads/';
const uploadRoot = path.resolve(env.UPLOAD_DIR);

/** The absolute folder that holds uploaded files (the API serves it at /uploads). */
export function uploadDirectory(): string {
  return uploadRoot;
}

/**
 * Finds the REAL image type by looking at the first bytes of the file ("magic numbers").
 * We never trust the file name or the type the browser claims.
 */
export function detectImageType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Checks and saves an image. Returns its public URL, e.g. /uploads/businesses/<id>/<random>.png */
export async function saveImage(folder: string, file: UploadedFile): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ValidationError([{ field: 'file', message: 'The image must be 5 MB or smaller.' }]);
  }
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new ValidationError([{ field: 'file', message: 'Please upload a JPEG, PNG or WebP image.' }]);
  }
  const relative = `${folder}/${randomUUID()}.${type}`; // random name: never use the uploader's file name
  const target = path.join(uploadRoot, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.buffer);
  return PUBLIC_PREFIX + relative;
}

/** Deletes a file saved by saveImage. Ignores URLs we did not create and files that are already gone. */
export async function deleteImage(url: string | null): Promise<void> {
  if (!url || !url.startsWith(PUBLIC_PREFIX)) return;
  const target = path.resolve(uploadRoot, url.slice(PUBLIC_PREFIX.length));
  if (!target.startsWith(uploadRoot + path.sep)) return; // never delete outside the upload folder
  try {
    await unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') logger.warn({ err: error, url }, 'Could not delete file');
  }
}
