import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const RESUME_DIRECTORY = path.resolve(__dirname, '../../uploads/resumes');
export const RESUME_PUBLIC_PATH = '/uploads/resumes/';

fs.mkdirSync(RESUME_DIRECTORY, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, RESUME_DIRECTORY),
  filename: (_req, file, callback) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.pdf';
    callback(null, `resume-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB limit
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
    const isAllowedMime = ALLOWED_MIME_TYPES.has(mime);

    if (!isAllowedExt || !isAllowedMime) {
      return callback(ApiError.badRequest('Unsupported file format. Only PDF and DOCX files are allowed for resume upload'));
    }

    return callback(null, true);
  },
});

const resumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Resume file size must not exceed 5 MB'));
      }
      return next(ApiError.badRequest(error.message));
    }

    return next(error);
  });
};

export default resumeUpload;
