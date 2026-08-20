import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set test-only configuration before any application module is imported.
// `connectDB` receives the generated URI below, so this placeholder is never used.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/vidyalink_test_placeholder';
process.env.JWT_SECRET = 'test-access-secret-not-for-production';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production';
process.env.JWT_ISSUER = 'vidyalink-api-test';
process.env.JWT_AUDIENCE = 'vidyalink-client-test';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const { connectDB } = await import('../src/config/db.js');
  await connectDB(mongoServer.getUri());
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});
