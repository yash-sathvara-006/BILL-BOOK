import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';

export const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Base Health Check
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
