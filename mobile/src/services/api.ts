import { API_BASE_URL } from '../config/env';
import { storage } from './storage';

export interface PaymentItem {
  _id: string;
  userId: string;
  recipientName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryData {
  totalAmount: number;
  totalCount: number;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await storage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async register(name: string, email: string, password: string) {
    return request<{ success: boolean; token: string; user: { id: string; name: string; email: string }; message: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }
    );
  },

  async login(email: string, password: string) {
    return request<{ success: boolean; token: string; user: { id: string; name: string; email: string }; message: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  },

  async getMe() {
    return request<{ success: boolean; user: { id: string; name: string; email: string } }>('/auth/me');
  },

  // Payments
  async getPayments(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ success: boolean; count: number; payments: PaymentItem[] }>(`/payments${query}`);
  },

  async getSummary() {
    return request<{ success: boolean; totalAmount: number; totalCount: number }>('/payments/summary');
  },

  async createPayment(data: {
    recipientName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank';
    note?: string;
  }) {
    return request<{ success: boolean; message: string; payment: PaymentItem }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePayment(
    id: string,
    data: {
      recipientName?: string;
      amount?: number;
      paymentDate?: string;
      paymentMethod?: 'Cash' | 'UPI' | 'Bank';
      note?: string;
    }
  ) {
    return request<{ success: boolean; message: string; payment: PaymentItem }>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePayment(id: string) {
    return request<{ success: boolean; message: string }>(`/payments/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadCSV(): Promise<string> {
    const token = await storage.getToken();
    const url = `${API_BASE_URL}/payments/export`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download CSV.');
    }

    return await response.text();
  },

  getPDFExportUrl(): string {
    return `${API_BASE_URL}/payments/export/pdf`;
  },
};
