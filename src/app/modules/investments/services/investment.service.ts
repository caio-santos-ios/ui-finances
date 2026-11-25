import { Injectable } from '@angular/core';
import { api } from 'src/app/shared/api/api';

export interface MarketAssetSearchResult {
  symbol: string;
  name: string;
  type: string;
  close?: number | null;
  alreadyRegistered?: boolean;
}

export interface MarketAssetCreateResult {
  alreadyExisted: boolean;
  asset: {
    id: string;
    ticker: string;
    name: string;
    type: string;
    currency?: string;
    manualPrice?: number;
    [key: string]: any;
  };
  currentPrice?: number | null;
  lastQuoteAt?: string | null;
}

export interface InvestmentAsset {
  id: string;
  ticker?: string;
  name: string;
  type: string;
  currency?: string;
  manualPrice?: number;
  [key: string]: any;
}

export interface CreateTransactionPayload {
  investmentAssetId: string;
  brokerId: string;
  kind: string;
  date: string;
  quantity?: number;
  unitPrice?: number;
  fees?: number;
  amount: number;
  notes?: string;
  createOperation?: boolean;
}

export interface B3ImportRow {
  ticker: string;
  name: string;
  type: string;
  kind: string;
  date: string;
  brokerName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  importHash: string;
  isDuplicate: boolean;
  hasWarning: boolean;
  warningMessage?: string | null;
  selected?: boolean;
}

export interface B3PreviewResponse {
  totalRows: number;
  newRows: number;
  duplicateRows: number;
  warningRows: number;
  rows: B3ImportRow[];
}

export interface B3ConfirmResponse {
  batchId?: string;
  importedCount: number;
  skippedCount: number;
  createdAssetTickers: string[];
}

export interface B3ImportBatch {
  batchId: string;
  importedAt: string;
  transactionCount: number;
  assetCount: number;
  firstDate?: string;
  lastDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InvestmentService {
  async searchMarketAssets(query: string): Promise<MarketAssetSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const response = await api.get('/investments/investment-assets/search', {
      params: { q: query.trim() },
    });
    return response.data?.data || response.data || [];
  }

  async createFromMarket(data: { symbol: string; type: string; name?: string }): Promise<MarketAssetCreateResult> {
    const response = await api.post('/investments/investment-assets/from-market', data);
    return response.data?.data || response.data;
  }

  async getAssets(): Promise<InvestmentAsset[]> {
    const response = await api.get('/investments/investment-assets');
    return response.data?.data || response.data || [];
  }

  async getBanks(): Promise<any[]> {
    const response = await api.get('/banks/select?deleted=false');
    return response.data?.data || response.data || [];
  }

  async createTransaction(payload: CreateTransactionPayload): Promise<any> {
    const response = await api.post('/investments/transactions', payload);
    return response.data?.data || response.data;
  }

  async updateTransaction(id: string, payload: CreateTransactionPayload): Promise<any> {
    const response = await api.put(`/investments/transactions/${id}`, { ...payload, id });
    return response.data?.data || response.data;
  }

  async deleteTransaction(id: string): Promise<any> {
    const response = await api.delete(`/investments/transactions/${id}`);
    return response.data?.data || response.data;
  }

  async getPortfolio(): Promise<any> {
    const response = await api.get('/investments/portfolio');
    return response.data?.data || response.data;
  }

  async getTransactions(params?: any): Promise<any[]> {
    const response = await api.get('/investments/transactions', { params });
    return response.data?.data || response.data || [];
  }

  async previewB3Import(file: File): Promise<B3PreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/investments/import/b3/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data || response.data;
  }

  async confirmB3Import(items: B3ImportRow[]): Promise<B3ConfirmResponse> {
    const response = await api.post('/investments/import/b3/confirm', { items });
    return response.data?.data || response.data;
  }

  async getB3ImportBatches(): Promise<B3ImportBatch[]> {
    const response = await api.get('/investments/import/b3/batches');
    return response.data?.data || [];
  }

  async revertB3Import(batchId: string): Promise<{ revertedTransactions: number; removedAssets: number }> {
    const response = await api.delete(`/investments/import/b3/batches/${batchId}`);
    return response.data?.data || response.data;
  }
}
