import mongoose from 'mongoose';

export const connectDB = async () => {
  const connectionUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vidyalink';

  try {
    const connection = await mongoose.connect(connectionUri);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }

  mongoose.connection.once('error', (error) => console.error('MongoDB runtime error:', error.message));
  mongoose.connection.once('disconnected', () => console.warn('MongoDB disconnected'));
};
