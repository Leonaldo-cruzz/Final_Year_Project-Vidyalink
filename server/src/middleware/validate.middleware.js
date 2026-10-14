import ApiError from '../utils/ApiError.js';

const validate = (schema) => (req, _res, next) => {
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
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.validated = result.data;
  if (result.data.body !== undefined) req.body = result.data.body;
  if (result.data.query !== undefined) {
    try {
      req.query = result.data.query;
    } catch {
      Object.assign(req.query, result.data.query);
    }
  }
  if (result.data.params !== undefined) {
    try {
      req.params = result.data.params;
    } catch {
      Object.assign(req.params, result.data.params);
    }
  }
  return next();
};

export default validate;
