import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROFILE_PHOTO_DIRECTORY = path.resolve(__dirname, '../../uploads/profile-photos');
export const PROFILE_PHOTO_PUBLIC_PATH = '/uploads/profile-photos/';

const ALLOWED_IMAGE_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});

fs.mkdirSync(PROFILE_PHOTO_DIRECTORY, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, PROFILE_PHOTO_DIRECTORY),
  filename: (_req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      return callback(ApiError.badRequest('Profile photo must be a JPEG, PNG, or WebP image'));
    }

    return callback(null, true);
  },
});

const profilePhotoUpload = (req, res, next) => {
  upload.single('profilePhoto')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      return next(ApiError.badRequest(error.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photo must not exceed 2 MB'
        : error.message));
    }

    return next(error);
  });
};

export default profilePhotoUpload;
