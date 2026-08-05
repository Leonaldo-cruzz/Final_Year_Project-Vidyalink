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

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, RESUME_DIRECTORY),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    callback(null, `resume-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB limit
  fileFilter: (_req, file, callback) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

    if (!isPdfMime && !isPdfExt) {
      return callback(ApiError.badRequest('Only PDF files are allowed for resume upload'));
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
