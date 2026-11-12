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
    const response = await api.put(`/investments/transactions/${id}`, payload);
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
}
