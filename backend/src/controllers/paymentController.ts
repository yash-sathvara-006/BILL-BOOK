import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { search } = req.query;
    const filter: Record<string, any> = { userId };

    if (search && typeof search === 'string' && search.trim() !== '') {
      filter.$or = [
        { recipientName: { $regex: search.trim(), $options: 'i' } },
        { note: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const payments = await Payment.find(filter).sort({ createdAt: -1, _id: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('[Get Payments Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to load payments.' });
  }
};

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const summary = result.length > 0 ? result[0] : { totalAmount: 0, totalCount: 0 };

    res.status(200).json({
      success: true,
      totalAmount: summary.totalAmount || 0,
      totalCount: summary.totalCount || 0,
    });
  } catch (error) {
    console.error('[Get Summary Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to load payment summary.' });
  }
};

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { recipientName, amount, paymentDate, paymentMethod, note } = req.body;

    if (!recipientName || recipientName.trim() === '') {
      res.status(400).json({ success: false, message: 'Recipient name is required.' });
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
      return;
    }

    const newPayment = await Payment.create({
      userId,
      recipientName: recipientName.trim(),
      amount: parsedAmount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'Cash',
      note: note ? note.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Payment saved successfully.',
      payment: newPayment,
    });
  } catch (error) {
    console.error('[Create Payment Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to save payment.' });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const payment = await Payment.findOne({ _id: id, userId });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment entry not found or unauthorized.' });
      return;
    }

    const { recipientName, amount, paymentDate, paymentMethod, note } = req.body;

    if (recipientName !== undefined) payment.recipientName = recipientName.trim();
    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
        return;
      }
      payment.amount = parsedAmount;
    }
    if (paymentDate !== undefined) payment.paymentDate = paymentDate;
    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (note !== undefined) payment.note = note.trim();

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully.',
      payment,
    });
  } catch (error) {
    console.error('[Update Payment Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment.' });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const deleted = await Payment.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Payment entry not found or unauthorized.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully.',
    });
  } catch (error) {
    console.error('[Delete Payment Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment.' });
  }
};

const formatToDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  return trimmed;
};

export const exportCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const payments = await Payment.find({ userId }).sort({ createdAt: -1, _id: -1 });

    const headers = ['Date', 'Paid To (Recipient)', 'Amount (INR)', 'Payment Method', 'Note'];
    const rows = payments.map(p => [
      `"${formatToDDMMYYYY(p.paymentDate)}"`,
      `"${p.recipientName.replace(/"/g, '""')}"`,
      p.amount,
      `"${p.paymentMethod}"`,
      `"${(p.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('[Export CSV Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate CSV file.' });
  }
};

export const exportPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [user, payments] = await Promise.all([
      User.findById(userId),
      Payment.find({ userId }).sort({ createdAt: -1, _id: -1 }),
    ]);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4
    const pageHeight = 841.89; // A4
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Header Title
    page.drawText('Mandavo Payment Book', {
      x: margin,
      y: y - 20,
      size: 20,
      font: fontBold,
      color: rgb(0.7, 0.35, 0.05),
    });

    page.drawText('Expense & Outgoing Payments Report', {
      x: margin,
      y: y - 35,
      size: 10,
      font,
      color: rgb(0.4, 0.45, 0.5),
    });

    const userName = user?.name || 'User';
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    page.drawText(`Recorded by: ${userName}`, {
      x: pageWidth - margin - 150,
      y: y - 20,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(`Date: ${dateStr}`, {
      x: pageWidth - margin - 150,
      y: y - 34,
      size: 9,
      font,
      color: rgb(0.4, 0.45, 0.5),
    });

    // Divider line
    y -= 48;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1.5,
      color: rgb(0.96, 0.62, 0.07),
    });

    // Summary Card Box
    y -= 12;
    const summaryCardHeight = 44;
    page.drawRectangle({
      x: margin,
      y: y - summaryCardHeight,
      width: contentWidth,
      height: summaryCardHeight,
      color: rgb(1, 0.98, 0.92),
      borderColor: rgb(0.99, 0.9, 0.54),
      borderWidth: 1,
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    page.drawText('TOTAL OUTGOING EXPENSES', {
      x: margin + 14,
      y: y - 16,
      size: 8,
      font: fontBold,
      color: rgb(0.57, 0.25, 0.05),
    });
    page.drawText(`INR ${totalAmount.toLocaleString('en-IN')}`, {
      x: margin + 14,
      y: y - 36,
      size: 16,
      font: fontBold,
      color: rgb(0.7, 0.35, 0.05),
    });

    page.drawText('TOTAL ENTRIES', {
      x: pageWidth - margin - 120,
      y: y - 16,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });
    page.drawText(`${payments.length} Payments`, {
      x: pageWidth - margin - 120,
      y: y - 34,
      size: 13,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= summaryCardHeight + 20;

    // Table Header Columns
    const colX = {
      idx: margin + 6,
      date: margin + 30,
      recipient: margin + 105,
      method: margin + 270,
      amount: margin + 345,
      note: margin + 420,
    };

    const drawTableHeader = (p: typeof page, atY: number) => {
      p.drawRectangle({
        x: margin,
        y: atY - 18,
        width: contentWidth,
        height: 22,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: rgb(0.89, 0.91, 0.94),
        borderWidth: 0.8,
      });

      p.drawText('#', { x: colX.idx, y: atY - 12, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
      p.drawText('Date', { x: colX.date, y: atY - 12, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
      p.drawText('Paid To (Recipient)', { x: colX.recipient, y: atY - 12, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
      p.drawText('Method', { x: colX.method, y: atY - 12, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
      p.drawText('Amount (INR)', { x: colX.amount, y: atY - 12, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
      p.drawText('Note', { x: colX.note, y: atY - 12, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
    };

    drawTableHeader(page, y);
    y -= 22;

    // Table Rows
    const rowHeight = 22;
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];

      if (y - rowHeight < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
        drawTableHeader(page, y);
        y -= 22;
      }

      if (i % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight + 4,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      page.drawLine({
        start: { x: margin, y: y - rowHeight + 4 },
        end: { x: pageWidth - margin, y: y - rowHeight + 4 },
        thickness: 0.5,
        color: rgb(0.93, 0.94, 0.96),
      });

      const recipientTrunc = p.recipientName.length > 25 ? p.recipientName.substring(0, 23) + '..' : p.recipientName;
      const noteTrunc = (p.note || '-').length > 20 ? (p.note || '').substring(0, 18) + '..' : (p.note || '-');

      page.drawText(`${i + 1}`, { x: colX.idx, y: y - 10, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
      page.drawText(formatToDDMMYYYY(p.paymentDate), { x: colX.date, y: y - 10, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(recipientTrunc, { x: colX.recipient, y: y - 10, size: 8.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(p.paymentMethod, { x: colX.method, y: y - 10, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(`INR ${p.amount.toLocaleString('en-IN')}`, { x: colX.amount, y: y - 10, size: 8.5, font: fontBold, color: rgb(0.7, 0.35, 0.05) });
      page.drawText(noteTrunc, { x: colX.note, y: y - 10, size: 8, font, color: rgb(0.4, 0.45, 0.5) });

      y -= rowHeight;
    }

    // Grand Total Row
    if (y - 30 < margin + 40) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    y -= 6;
    page.drawRectangle({
      x: margin,
      y: y - 24,
      width: contentWidth,
      height: 24,
      color: rgb(1, 0.98, 0.92),
      borderColor: rgb(0.99, 0.9, 0.54),
      borderWidth: 1,
    });

    page.drawText('TOTAL OUTGOING EXPENSES:', {
      x: margin + 120,
      y: y - 16,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(`INR ${totalAmount.toLocaleString('en-IN')}`, {
      x: colX.amount,
      y: y - 16,
      size: 10,
      font: fontBold,
      color: rgb(0.7, 0.35, 0.05),
    });

    // Footer
    page.drawText('Generated by Mandavo Payment Book Ledger', {
      x: margin,
      y: margin - 15 > 10 ? margin - 15 : 15,
      size: 7.5,
      font,
      color: rgb(0.6, 0.65, 0.7),
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="payments_report.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('[Export PDF Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF file.' });
  }
};
