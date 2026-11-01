/**
 * Receives ONE uploaded image (multipart/form-data, field name "file"), kept in memory.
 * The size limit is checked here; the real file type is checked by StorageService.
 */
import multer from 'multer';
import { MAX_IMAGE_BYTES } from '../../services/storage.service';

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 },
}).single('file');
