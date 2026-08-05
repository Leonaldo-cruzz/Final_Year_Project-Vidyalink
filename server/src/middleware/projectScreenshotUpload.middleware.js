import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_SCREENSHOT_DIRECTORY = path.resolve(__dirname, '../../uploads/projects');
export const PROJECT_SCREENSHOT_PUBLIC_PATH = '/uploads/projects/';

const ALLOWED_MIME_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});

fs.mkdirSync(PROJECT_SCREENSHOT_DIRECTORY, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, PROJECT_SCREENSHOT_DIRECTORY),
    filename: (_req, file, callback) => {
      const extension = ALLOWED_MIME_TYPES[file.mimetype] || '.jpg';
      callback(null, `project-${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      return callback(ApiError.badRequest('Only JPG, PNG, and WEBP screenshots are allowed'));
    }
    return callback(null, true);
  },
});

const projectScreenshotUpload = (req, res, next) => {
  upload.array('screenshots', 6)(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Each screenshot must not exceed 5 MB'));
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return next(ApiError.badRequest('You can upload a maximum of 6 screenshots'));
      }
      return next(ApiError.badRequest(error.message));
    }

    return next(error);
  });
};

export default projectScreenshotUpload;
