import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { validateEnvironment } from './config/environment.js';

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
    console.error('Unable to start VidyaLink API:', error.message);
    process.exit(1);
  });
}
