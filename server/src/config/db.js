import mongoose from 'mongoose';
import { env } from './env.js';
import {
  createRedactor,
  describeDbError,
  extractMongoHost,
  formatDbErrorDetails,
} from '../utils/dbErrorDetails.js';

export const SANITIZED_DB_ERROR_MESSAGE =
  'MongoDB connection failed. Verify MONGODB_URI, database credentials, and Atlas network access.';

export const DEFAULT_DB_NAME = 'vidyalink';

/**
 * Extracts explicitly allowlisted, safe metadata from an error.
 * Only alphanumeric error names (e.g. MongoParseError) and numeric error codes
 * are permitted. Never includes raw messages, URIs, or credentials.
 */
export const extractSafeErrorMetadata = (error) => {
  const parts = [];
  if (error?.name && typeof error.name === 'string' && /^[A-Za-z0-9_]+$/.test(error.name)) {
    parts.push(`name: ${error.name}`);
  }
  if (typeof error?.code === 'number' && Number.isInteger(error.code)) {
    parts.push(`code: ${error.code}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
};

/**
 * Builds one multi-line log entry with the real (redacted) driver error,
 * its cause, per-server errors and a likely fix.
 */
const buildDbErrorLog = (headline, error, redact, extraLines = []) => {
  const safeMeta = extractSafeErrorMetadata(error);
  const metaSuffix = safeMeta ? ` (${safeMeta})` : '';
  const details = formatDbErrorDetails(describeDbError(error, redact));
  return [`${headline}${metaSuffix}`, ...extraLines, details].filter(Boolean).join('\n');
};

export const connectDB = async (
  mongoUri = env.MONGODB_URI,
  client = mongoose,
  logger = console,
  options = {}
) => {
  const redact = createRedactor(mongoUri);
  const targetHost = extractMongoHost(mongoUri) || 'unknown host';

  try {
    const connection = await client.connect(mongoUri, {
      ...options,
      dbName: DEFAULT_DB_NAME,
    });
    const host = connection?.connection?.host || connection?.host || 'connected';
    const dbName = connection?.connection?.name || connection?.name || DEFAULT_DB_NAME;
    logger.log(`MongoDB connected: ${host} (db: ${dbName})`);
  } catch (error) {
    logger.error(buildDbErrorLog(
      `MongoDB connection error: ${SANITIZED_DB_ERROR_MESSAGE}`,
      error,
      redact,
      [`  target:   ${targetHost} (db: ${DEFAULT_DB_NAME})`]
    ));

    const sanitizedError = new Error(SANITIZED_DB_ERROR_MESSAGE);
    if (error?.name && /^[A-Za-z0-9_]+$/.test(error.name)) {
      sanitizedError.name = error.name;
    }
    if (typeof error?.code === 'number' && Number.isInteger(error.code)) {
      sanitizedError.code = error.code;
    }
    throw sanitizedError;
  }

  // `on`, not `once`: every runtime error / disconnect should be logged,
  // not just the first one after startup.
  const connection = client?.connection;
  connection?.on?.('error', (error) => {
    logger.error(buildDbErrorLog('MongoDB runtime error: Database encountered an error', error, redact));
  });
  connection?.on?.('disconnected', () => logger.warn(`MongoDB disconnected from ${targetHost}`));
  connection?.on?.('reconnected', () => logger.log(`MongoDB reconnected to ${targetHost}`));
};
