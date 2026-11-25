import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { InvestmentAssetModalComponent } from '../components/modal/asset-modal/investment-asset-modal.component';
import { InvestmentTransactionModalComponent } from '../components/modal/transaction-modal/investment-transaction-modal.component';
import { InvestmentAssetHistoryModalComponent } from '../components/modal/asset-history-modal/investment-asset-history-modal.component';
import { B3ImportModalComponent } from '../components/modal/b3-import-modal/b3-import-modal.component';

@Component({
  selector: 'app-investments',
  standalone: true,
  templateUrl: './investments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, BreadcrumbComponent, MoneyPipe],
})
export class InvestmentsComponent extends MyFinance implements OnInit {
  activeTab: 'positions' | 'closed' | 'transactions' | 'assets' = 'positions';
  isLoading = false;
  showFilters = false;
  showCards = this.getStoredCardsVisibility('mf_show_cards_investments');

  portfolio: any = {
    totalInvested: 0,
    currentValue: 0,
    unrealizedProfit: 0,
    unrealizedProfitPercent: 0,
    incomeReceived: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    positions: [],
  };

  transactions: any[] = [];
  assets: any[] = [];

  filters = {
    positionsSearch: '',
    positionsType: '',
    transactionsKind: '',
    transactionsAssetId: '',
    assetsSearch: '',
    assetsType: '',
  };

  constructor(private dialog: Dialog) {
    super();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  toggleCards(): void {
    this.showCards = !this.showCards;
    this.setStoredCardsVisibility('mf_show_cards_investments', this.showCards);
    this.cdr.markForCheck();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
    this.cdr.markForCheck();
  }

  clearFilters() {
    if (this.activeTab === 'positions' || this.activeTab === 'closed') {
      this.filters.positionsSearch = '';
      this.filters.positionsType = '';
    } else if (this.activeTab === 'transactions') {
      this.filters.transactionsKind = '';
      this.filters.transactionsAssetId = '';
      this.loadTransactions();
    } else if (this.activeTab === 'assets') {
      this.filters.assetsSearch = '';
      this.filters.assetsType = '';
    }
    this.cdr.markForCheck();
  }

  positionsSortColumn: string = '';
  positionsSortDirection: 'asc' | 'desc' | '' = '';
  closedSortColumn: string = '';
  closedSortDirection: 'asc' | 'desc' | '' = '';
  transactionsSortColumn: string = '';
  transactionsSortDirection: 'asc' | 'desc' | '' = '';
  assetsSortColumn: string = '';
  assetsSortDirection: 'asc' | 'desc' | '' = '';

  get activePositions(): any[] {
    return (this.portfolio?.positions || []).filter((p: any) => (p.quantity || 0) > 0);
  }

  get closedPositions(): any[] {
    return (this.portfolio?.positions || []).filter((p: any) => (p.quantity || 0) <= 0);
  }

  get filteredPositions(): any[] {
    let list = this.activePositions;
    if (this.filters.positionsSearch) {
      const q = this.filters.positionsSearch.toLowerCase();
      list = list.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.ticker && p.ticker.toLowerCase().includes(q))
      );
    }
    if (this.filters.positionsType) {
      list = list.filter((p: any) => p.type === this.filters.positionsType);
    }
    if (this.positionsSortColumn) {
      return this.sortData(list, this.positionsSortColumn, this.positionsSortColumn, this.positionsSortDirection).list;
    }
    return list;
  }

  onPositionsSort(column: string) {
    this.positionsSortDirection =
      this.positionsSortColumn === column && this.positionsSortDirection === 'asc' ? 'desc' : 'asc';
    this.positionsSortColumn = column;
    this.cdr.markForCheck();
  }

  get filteredClosedPositions(): any[] {
    let list = this.closedPositions;
    if (this.filters.positionsSearch) {
      const q = this.filters.positionsSearch.toLowerCase();
      list = list.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.ticker && p.ticker.toLowerCase().includes(q))
      );
    }
    if (this.filters.positionsType) {
      list = list.filter((p: any) => p.type === this.filters.positionsType);
    }
    if (this.closedSortColumn) {
      return this.sortData(list, this.closedSortColumn, this.closedSortColumn, this.closedSortDirection).list;
    }
    return list;
  }

  onClosedSort(column: string) {
    this.closedSortDirection =
      this.closedSortColumn === column && this.closedSortDirection === 'asc' ? 'desc' : 'asc';
    this.closedSortColumn = column;
    this.cdr.markForCheck();
  }

  get sortedTransactions(): any[] {
    let list = this.transactions || [];
    if (this.transactionsSortColumn) {
      return this.sortData(list, this.transactionsSortColumn, this.transactionsSortColumn, this.transactionsSortDirection).list;
    }
    return list;
  }

  onTransactionsSort(column: string) {
    this.transactionsSortDirection =
      this.transactionsSortColumn === column && this.transactionsSortDirection === 'asc' ? 'desc' : 'asc';
    this.transactionsSortColumn = column;
    this.cdr.markForCheck();
  }

  get filteredAssets(): any[] {
    let list = this.assets || [];
    if (this.filters.assetsSearch) {
      const q = this.filters.assetsSearch.toLowerCase();
      list = list.filter((a: any) =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.ticker && a.ticker.toLowerCase().includes(q))
      );
    }
    if (this.filters.assetsType) {
      list = list.filter((a: any) => a.type === this.filters.assetsType);
    }
    if (this.assetsSortColumn) {
      return this.sortData(list, this.assetsSortColumn, this.assetsSortColumn, this.assetsSortDirection).list;
    }
    return list;
  }

  onAssetsSort(column: string) {
    this.assetsSortDirection =
      this.assetsSortColumn === column && this.assetsSortDirection === 'asc' ? 'desc' : 'asc';
    this.assetsSortColumn = column;
    this.cdr.markForCheck();
  }

  setTab(tab: 'positions' | 'closed' | 'transactions' | 'assets') {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  getAssetTypeLabel(type: string): string {
    const map: Record<string, string> = {
      STOCK: 'Ação',
      REIT: 'FII',
      FII: 'FII',
      ETF: 'ETF',
      BDR: 'BDR',
      FIXED_INCOME: 'Renda Fixa',
      CRYPTO: 'Cripto',
      OTHER: 'Outro',
    };
    return map[type] || type;
  }

  async loadAll() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();
      await Promise.all([
        this.loadPortfolio(),
        this.loadTransactions(),
        this.loadAssets(),
      ]);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async loadPortfolio() {
    try {
      const { data } = await api.get('/investments/portfolio');
      if (data?.data) {
        this.portfolio = data.data;
      }
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async loadTransactions() {
    try {
      let query = '';
      if (this.filters.transactionsKind) query += `&kind=${this.filters.transactionsKind}`;
      if (this.filters.transactionsAssetId) query += `&assetId=${this.filters.transactionsAssetId}`;

      const { data } = await api.get(`/investments/transactions?${query}`);
      this.transactions = data?.data || [];
      this.cdr.markForCheck();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async loadAssets() {
    try {
      const { data } = await api.get('/investments/investment-assets');
      this.assets = data?.data || [];
      this.cdr.markForCheck();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  openAssetModal(asset?: any) {
    const ref = this.dialog.open(InvestmentAssetModalComponent, {
      data: { asset },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadAll();
    });
  }

  openB3ImportModal() {
    const ref = this.dialog.open(B3ImportModalComponent, {
      disableClose: true,
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadAll();
    });
  }

  openTransactionModal(defaultAssetId?: string) {
    const ref = this.dialog.open(InvestmentTransactionModalComponent, {
      data: { defaultAssetId },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadAll();
    });
  }

  editTransaction(tx: any) {
    const ref = this.dialog.open(InvestmentTransactionModalComponent, {
      data: { transaction: tx, defaultAssetId: tx.investmentAssetId },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadAll();
    });
  }

  openAssetHistory(item: any) {
    const asset = {
      id: item.investmentAssetId || item.id,
      name: item.name,
      ticker: item.ticker,
    };
    const ref = this.dialog.open(InvestmentAssetHistoryModalComponent, {
      data: { asset },
    });
    ref.closed.subscribe(async (res) => {
      if (res) await this.loadAll();
    });
  }

  async deleteAsset(id: string) {
    const result = await Swal.fire({
      title: 'Excluir ativo?',
      text: 'Deseja realmente excluir este ativo de investimento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/investments/investment-assets/${id}`);
      this.toastSuccess('Ativo excluído com sucesso!');
      await this.loadAll();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async deleteTransaction(id: string) {
    const result = await Swal.fire({
      title: 'Excluir movimentação?',
      text: 'Deseja realmente excluir esta movimentação? A posição na carteira será recalculada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/investments/transactions/${id}`);
      this.toastSuccess('Movimentação excluída com sucesso!');
      await this.loadAll();
    } catch (error) {
      this.normalizeErr(error);
    }
  }
}
