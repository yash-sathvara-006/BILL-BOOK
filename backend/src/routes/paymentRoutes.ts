import { Router } from 'express';
import {
  getPayments,
  getSummary,
  createPayment,
  updatePayment,
  deletePayment,
  exportCSV,
  exportPDF,
} from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protect all payment routes with authentication
router.use(authenticateToken as any);

router.get('/', getPayments as any);
router.get('/summary', getSummary as any);
router.get('/export', exportCSV as any);
router.get('/export/pdf', exportPDF as any);
router.post('/', createPayment as any);
router.put('/:id', updatePayment as any);
router.delete('/:id', deletePayment as any);

export default router;
