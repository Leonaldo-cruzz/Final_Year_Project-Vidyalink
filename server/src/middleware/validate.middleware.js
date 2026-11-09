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
  // Express 5 exposes req.query as a re-parsed getter, so coerced/defaulted
  // query values cannot be written back — controllers read req.validated.query.
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
