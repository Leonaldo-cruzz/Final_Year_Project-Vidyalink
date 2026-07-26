import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }

  mongoose.connection.once('error', (error) => console.error('MongoDB runtime error:', error.message));
  mongoose.connection.once('disconnected', () => console.warn('MongoDB disconnected'));
};
