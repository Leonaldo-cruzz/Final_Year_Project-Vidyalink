import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import logger from '../utils/logger.js';

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    return ApiResponse.error(res, error.statusCode, error.message, error.errors);
  }

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((entry) => ({
      field: entry.path,
      message: entry.message,
    }));
    return ApiResponse.error(res, 400, 'Validation failed', errors);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return ApiResponse.error(res, 409, `${field} already exists`, [
      { field, message: `${field} already exists` },
    ]);
  }

  if (error.name === 'CastError') {
    return ApiResponse.error(res, 400, `Invalid ${error.path}`);
  }

  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 401, 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, 'Token has expired');
  }

  logger.error('Unhandled request error', error);
  return ApiResponse.error(res, 500, 'Internal server error');
};

export default errorHandler;
