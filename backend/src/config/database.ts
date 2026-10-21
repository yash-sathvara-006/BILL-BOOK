import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandavo_db';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
};

