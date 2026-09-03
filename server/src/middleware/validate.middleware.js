import ApiError from '../utils/ApiError.js';
import fs from 'node:fs/promises';

const cleanupRejectedUploads = async (req) => {
  const uploads = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
  await Promise.all(uploads.map(async (file) => {
    if (!file.path) return;
    try {
      await fs.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('Unable to remove invalid upload:', error.message);
    }
  }));
};

const validate = (schema) => async (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.errors.map((error) => ({
      field: error.path.join('.'),
      message: error.message,
    }));
    await cleanupRejectedUploads(req);
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.validated = result.data;
  if (result.data.body !== undefined) req.body = result.data.body;
  return next();
};

export default validate;
