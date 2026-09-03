import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CERTIFICATE_DIRECTORY = path.resolve(__dirname, '../../uploads/certificates');
export const CERTIFICATE_PUBLIC_PATH = '/uploads/certificates/';

const ALLOWED_MIME_TYPES = Object.freeze({
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
});

fs.mkdirSync(CERTIFICATE_DIRECTORY, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, CERTIFICATE_DIRECTORY),
  filename: (_req, file, callback) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.pdf';
    callback(null, `cert-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB limit
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidMime = Boolean(ALLOWED_MIME_TYPES[file.mimetype]);
    const expectedExtension = ALLOWED_MIME_TYPES[file.mimetype];
    const isValidExt = expectedExtension === '.jpg' ? ['.jpg', '.jpeg'].includes(ext) : ext === expectedExtension;

    if (!isValidMime && !isValidExt) {
      return callback(ApiError.badRequest('Only PDF, JPG, and PNG files are allowed for certificates'));
    }

    return callback(null, true);
  },
});

const certificateUpload = (req, res, next) => {
  upload.single('certificateFile')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Certificate file size must not exceed 5 MB'));
      }
      return next(ApiError.badRequest(error.message));
    }

    return next(error);
  });
};

export default certificateUpload;
