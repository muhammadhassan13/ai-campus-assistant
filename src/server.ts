import dns from 'node:dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';

// Force Node.js to use Google DNS for host resolution
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || '';

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing from environment variables.');
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();
