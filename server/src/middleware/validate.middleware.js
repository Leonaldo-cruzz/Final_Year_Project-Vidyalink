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
  return next();
};

export default validate;
