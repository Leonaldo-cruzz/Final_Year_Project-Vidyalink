import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';
import {
  createRedactor,
  describeDbError,
  formatDbErrorDetails,
  isDbError,
} from '../utils/dbErrorDetails.js';

const redact = createRedactor(env.MONGODB_URI);

const describeRequest = (req) => {
  if (!req) return 'unknown request';
  const user = req.user?._id ? ` user=${req.user._id}${req.user.role ? ` (${req.user.role})` : ''}` : '';
  return `${req.method} ${req.originalUrl || req.url}${user}`;
};

/**
 * Logs a database error with the request it happened on and the full
 * (credential-redacted) driver details, so a generic API response can be
 * traced back to its real cause in the server logs.
 */
const logDbError = (level, label, error, req) => {
  const details = formatDbErrorDetails(describeDbError(error, redact));
  const stack = level === 'error' && error?.stack
    ? `\n  stack:\n${redact(error.stack).split('\n').slice(1).map((line) => `  ${line}`).join('\n')}`
    : '';
  logger[level](`${label} on ${describeRequest(req)}\n${details}${stack}`);
};

const errorHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      logger.error(`ApiError ${error.statusCode} on ${describeRequest(req)}: ${redact(error.message)}`);
    }
    return ApiResponse.error(res, error.statusCode, error.message, error.errors);
  }

  if (error.name === 'ValidationError') {
    logDbError('warn', 'Mongoose validation failed', error, req);
    const errors = Object.values(error.errors).map((entry) => ({
      field: entry.path,
      message: entry.message,
    }));
    return ApiResponse.error(res, 400, 'Validation failed', errors);
  }

  if (error.code === 11000) {
    logDbError('warn', 'Duplicate key', error, req);
    const field = Object.keys(error.keyValue || {})[0] || 'value';
    return ApiResponse.error(res, 409, `${field} already exists`, [
      { field, message: `${field} already exists` },
    ]);
  }

  if (error.name === 'CastError') {
    logDbError('warn', 'Invalid value for database query', error, req);
    return ApiResponse.error(res, 400, `Invalid ${error.path}`);
  }

  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 401, 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, 'Token has expired');
  }

  // Errors raised by Express / body-parser carry an HTTP status
  // (400 malformed JSON, 413 payload too large, 415 ...). Report those as-is.
  const status = error.status || error.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const message = error.type === 'entity.too.large'
      ? 'Request body is too large'
      : error.type === 'entity.parse.failed'
        ? 'Malformed JSON in request body'
        : error.expose && error.message ? error.message : 'Bad request';
    return ApiResponse.error(res, status, message);
  }

  if (isDbError(error)) {
    logDbError('error', 'Database error', error, req);
  } else {
    logger.error(`Unhandled error on ${describeRequest(req)}: ${redact(error?.message)}\n${redact(error?.stack || '')}`);
  }
  return ApiResponse.error(res, 500, 'Internal server error');
};

export default errorHandler;
