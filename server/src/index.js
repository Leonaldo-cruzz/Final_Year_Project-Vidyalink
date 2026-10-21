import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { validateEnvironment } from './config/environment.js';

/**
 * Sanitizes startup error messages, ensuring connection URIs and credentials
 * are never printed to stdout/stderr.
 */
export const sanitizeStartupErrorMessage = (error) => {
  if (!error) return 'Unknown startup error';
  const rawMessage = typeof error === 'string' ? error : (error.message || String(error));
  return rawMessage
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb$1://<redacted>')
    .replace(/(?:password|pwd|secret)=([^&\s]+)/gi, 'password=<redacted>');
};

export const handleStartupError = (error, logger = console) => {
  const safeMessage = sanitizeStartupErrorMessage(error);
  logger.error('Unable to start VidyaLink API:', safeMessage);
};

export const start = async () => {
  validateEnvironment();
  await connectDB();

  const app = createApp();
  return app.listen(env.PORT, () => {
    console.log(`VidyaLink API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
};

if (process.argv[1]?.endsWith('index.js')) {
  start().catch((error) => {
    handleStartupError(error);
    process.exit(1);
  });
}
