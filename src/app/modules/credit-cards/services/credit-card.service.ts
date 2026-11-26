import { Injectable } from '@angular/core';
import { api } from 'src/app/shared/api/api';

export interface CreditCardDto {
  id: string;
  name: string;
  bankId?: string;
  bankName?: string;
  brand: string;
  limit: number;
  usedLimit: number;
  availableLimit: number;
  usagePercent: number;
  closingDay: number;
  dueDay: number;
  bestPurchaseDay: number;
  color: string;
  lastDigits?: string;
  createdAt: string;
}

export interface CreditCardInvoiceDto {
  id: string;
  creditCardId: string;
  month: number;
  year: number;
  label: string;
  closingDate: string;
  dueDate: string;
  status: 'open' | 'closed' | 'paid';
  isFuture: boolean;
  paidAt?: string;
  paymentBankId?: string;
  paymentBankName?: string;
  totalAmount: number;
  transactionCount: number;
}

export interface CreditCardTransactionDto {
  id: string;
  creditCardId: string;
  invoiceId: string;
  categoryId?: string;
  categoryName: string;
  description: string;
  value: number;
  date: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentGroupId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreditCardService {
  async getAll(): Promise<CreditCardDto[]> {
    const { data } = await api.get('/credit-cards');
    return data?.data ?? [];
  }

  async create(payload: any): Promise<any> {
    const { data } = await api.post('/credit-cards', payload);
    return data;
  }

  async update(id: string, payload: any): Promise<any> {
    const { data } = await api.put(`/credit-cards/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<any> {
    const { data } = await api.delete(`/credit-cards/${id}`);
    return data;
  }

  async getInvoices(cardId: string): Promise<CreditCardInvoiceDto[]> {
    const { data } = await api.get(`/credit-cards/${cardId}/invoices`);
    return data?.data ?? [];
  }

  async getInvoiceTransactions(cardId: string, invoiceId: string): Promise<CreditCardTransactionDto[]> {
    const { data } = await api.get(`/credit-cards/${cardId}/invoices/${invoiceId}/transactions`);
    return data?.data ?? [];
  }

  async createTransaction(cardId: string, payload: any): Promise<any> {
    const { data } = await api.post(`/credit-cards/${cardId}/transactions`, payload);
    return data;
  }

  async updateTransaction(cardId: string, txId: string, payload: any): Promise<any> {
    const { data } = await api.put(`/credit-cards/${cardId}/transactions/${txId}`, payload);
    return data;
  }

  async deleteTransaction(cardId: string, txId: string, deleteGroup: boolean = false): Promise<any> {
    const { data } = await api.delete(`/credit-cards/${cardId}/transactions/${txId}?deleteGroup=${deleteGroup}`);
    return data;
  }

  async payInvoice(cardId: string, invoiceId: string, payload: any): Promise<any> {
    const { data } = await api.post(`/credit-cards/${cardId}/invoices/${invoiceId}/pay`, payload);
    return data;
  }
}
