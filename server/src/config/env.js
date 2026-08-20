import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A deployment may provide variables directly. For local development, support one
// .env file: prefer the repository root, then fall back to server/.env.
const environmentFileCandidates = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
];
const environmentFilePath = environmentFileCandidates.find((candidate) => existsSync(candidate));

if (environmentFilePath) {
  dotenv.config({ path: environmentFilePath });
}

export const requiredEnvironmentVariables = Object.freeze([
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
]);

export class EnvironmentConfigurationError extends Error {
  constructor({ missing = [], invalid = [] } = {}) {
    const sections = ['ENVIRONMENT CONFIGURATION ERROR'];

    if (missing.length > 0) {
      sections.push(`Missing:\n${missing.map((name) => `- ${name}`).join('\n')}`);
    }

    if (invalid.length > 0) {
      sections.push(`Invalid:\n${invalid.map((message) => `- ${message}`).join('\n')}`);
    }

    sections.push('Create a local .env file from .env.example or configure deployment secrets.');
    super(sections.join('\n\n'));
    this.name = 'EnvironmentConfigurationError';
    this.missing = missing;
    this.invalid = invalid;
  }
}

const getValue = (source, key) => {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : value;
};

const hasValue = (source, key) => Boolean(getValue(source, key));

const optionalValue = (source, key, fallback = undefined) => getValue(source, key) || fallback;

const parsePositiveInteger = (source, key, fallback, invalid, { min = 1 } = {}) => {
  const value = optionalValue(source, key);
  if (value === undefined) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || String(parsed) !== String(value)) {
    invalid.push(`${key} must be an integer greater than or equal to ${min}`);
    return fallback;
  }

  return parsed;
};

const validateProductionSettings = (configuration, invalid) => {
  if (configuration.nodeEnv === 'production') {
    if (configuration.jwt.secret.length < 32) {
      invalid.push('JWT_SECRET must be at least 32 characters in production');
    }
    if (configuration.jwt.refreshSecret.length < 32) {
      invalid.push('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
  }

  if (!['lax', 'strict', 'none'].includes(configuration.security.cookieSameSite)) {
    invalid.push('COOKIE_SAME_SITE must be one of: lax, strict, none');
  }
};

/**
 * Create the application's server-only configuration from an environment source.
 * Kept exportable so validation can be tested without mutating process.env.
 */
export const createEnvironment = (source = process.env) => {
  const missing = requiredEnvironmentVariables.filter((key) => !hasValue(source, key));
  const invalid = [];

  if (missing.length > 0) {
    throw new EnvironmentConfigurationError({ missing });
  }

  const nodeEnv = getValue(source, 'NODE_ENV');
  const cookieSameSite = optionalValue(source, 'COOKIE_SAME_SITE', nodeEnv === 'production' ? 'strict' : 'lax');
  const configuration = {
    nodeEnv,
    port: parsePositiveInteger(source, 'PORT', 5000, invalid),
    database: {
      mongoUri: getValue(source, 'MONGODB_URI'),
    },
    jwt: {
      secret: getValue(source, 'JWT_SECRET'),
      refreshSecret: getValue(source, 'JWT_REFRESH_SECRET'),
      expiresIn: getValue(source, 'JWT_EXPIRES_IN'),
      refreshExpiresIn: getValue(source, 'JWT_REFRESH_EXPIRES_IN'),
      issuer: optionalValue(source, 'JWT_ISSUER', 'vidyalink-api'),
      audience: optionalValue(source, 'JWT_AUDIENCE', 'vidyalink-client'),
    },
    api: {
      prefix: optionalValue(source, 'API_PREFIX', '/api/v1'),
      baseUrl: optionalValue(source, 'API_BASE_URL', 'http://localhost:5000/api/v1'),
    },
    client: {
      url: optionalValue(source, 'CLIENT_URL', 'http://localhost:5173'),
      corsOrigins: optionalValue(source, 'CORS_ORIGIN', 'http://localhost:5173'),
    },
    security: {
      cookieSameSite,
      cookieDomain: optionalValue(source, 'COOKIE_DOMAIN'),
      trustProxy: optionalValue(source, 'TRUST_PROXY', 'false'),
      rateLimitWindowMs: parsePositiveInteger(source, 'RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, invalid),
      rateLimitMaxRequests: parsePositiveInteger(source, 'RATE_LIMIT_MAX_REQUESTS', 100, invalid),
    },
    github: {
      token: optionalValue(source, 'GITHUB_TOKEN'),
      clientId: optionalValue(source, 'GITHUB_CLIENT_ID'),
      clientSecret: optionalValue(source, 'GITHUB_CLIENT_SECRET'),
      apiBaseUrl: optionalValue(source, 'GITHUB_API_BASE_URL', 'https://api.github.com'),
      requestTimeoutMs: parsePositiveInteger(source, 'GITHUB_REQUEST_TIMEOUT_MS', 8_000, invalid),
    },
    ai: {
      serviceUrl: optionalValue(source, 'AI_SERVICE_URL'),
      serviceApiKey: optionalValue(source, 'AI_SERVICE_API_KEY'),
      geminiApiKey: optionalValue(source, 'GEMINI_API_KEY'),
      openaiApiKey: optionalValue(source, 'OPENAI_API_KEY'),
    },
    cloudinary: {
      cloudName: optionalValue(source, 'CLOUDINARY_CLOUD_NAME'),
      apiKey: optionalValue(source, 'CLOUDINARY_API_KEY'),
      apiSecret: optionalValue(source, 'CLOUDINARY_API_SECRET'),
    },
    email: {
      host: optionalValue(source, 'EMAIL_HOST'),
      port: parsePositiveInteger(source, 'EMAIL_PORT', undefined, invalid),
      user: optionalValue(source, 'EMAIL_USER'),
      password: optionalValue(source, 'EMAIL_PASSWORD'),
      from: optionalValue(source, 'EMAIL_FROM'),
    },
    seed: {
      demoUserPassword: optionalValue(source, 'DEMO_USER_PASSWORD'),
    },
  };

  validateProductionSettings(configuration, invalid);
  if (invalid.length > 0) {
    throw new EnvironmentConfigurationError({ invalid });
  }

  return Object.freeze({
    ...configuration,
    database: Object.freeze(configuration.database),
    jwt: Object.freeze(configuration.jwt),
    api: Object.freeze(configuration.api),
    client: Object.freeze(configuration.client),
    security: Object.freeze(configuration.security),
    github: Object.freeze(configuration.github),
    ai: Object.freeze(configuration.ai),
    cloudinary: Object.freeze(configuration.cloudinary),
    email: Object.freeze(configuration.email),
    seed: Object.freeze(configuration.seed),
  });
};

export const env = createEnvironment();

export default env;
