import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(env.database.mongoUri);
    logger.info('MongoDB connected', { host: connection.connection.host });
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    throw new Error('MongoDB connection failed');
  }

  mongoose.connection.once('error', (error) => logger.error('MongoDB runtime error', error));
  mongoose.connection.once('disconnected', () => logger.warn('MongoDB disconnected'));
};
