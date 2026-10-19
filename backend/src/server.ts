import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { connectDB } from './config/database';

const PORT = process.env.PORT || 5000;

// Connect Database & Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Mandavo Payment Book Server running on port ${PORT}`);
    console.log(`[Server] Local URL: http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/v1/health`);
  });
});
