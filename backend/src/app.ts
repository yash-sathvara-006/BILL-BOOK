import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';

export const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Auto-connect DB middleware for serverless/local requests
app.use(async (_req: Request, _res: Response, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Root & Health Check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Mandavo Payment Book API is live and running!',
    docs: '/api/v1/health',
  });
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'Mandavo Payment Book API',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Fallback 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});
