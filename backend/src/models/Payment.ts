import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  recipientName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank';
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    paymentDate: {
      type: String,
      required: [true, 'Payment date is required'],
      default: () => new Date().toISOString().split('T')[0],
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank'],
      default: 'Cash',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's payments sorted by date
PaymentSchema.index({ userId: 1, paymentDate: -1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
