import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import logger from './utils/logger.js';

export const start = async () => {
  await connectDB();

  const app = createApp();
  return app.listen(env.port, () => {
    logger.info('VidyaLink API listening', { port: env.port, environment: env.nodeEnv });
  });
};

if (process.argv[1]?.endsWith('index.js')) {
  start().catch((error) => {
    logger.error('Unable to start VidyaLink API', error);
    process.exit(1);
  });
}
