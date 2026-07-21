import 'dotenv/config';

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { validateEnvironment } from './config/environment.js';

const port = Number.parseInt(process.env.PORT, 10) || 5000;

export const start = async () => {
  validateEnvironment();
  await connectDB();

  const app = createApp();
  return app.listen(port, () => {
    console.log(`VidyaLink API listening on port ${port} (${process.env.NODE_ENV || 'development'})`);
  });
};

if (process.argv[1]?.endsWith('index.js')) {
  start().catch((error) => {
    console.error('Unable to start VidyaLink API:', error.message);
    process.exitCode = 1;
  });
}
