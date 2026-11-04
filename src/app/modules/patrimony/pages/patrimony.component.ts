import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { Dialog } from '@angular/cdk/dialog';
import { AssetModalComponent } from '../components/modal/asset-modal.component';
import { DebtModalComponent } from '../components/modal/debt-modal.component';
import { PayInstallmentModalComponent } from '../components/modal/pay-installment-modal.component';
import { AssetValuationModalComponent } from '../components/modal/asset-valuation-modal.component';
import { DebtHistoryModalComponent } from '../components/modal/debt-history-modal.component';
import { DisposeAssetModalComponent } from '../components/modal/dispose-asset-modal.component';
import { ResetPagination, TPagination } from 'src/app/shared/models/pagination';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';

@Component({
  selector: 'app-patrimony',
  templateUrl: './patrimony.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, MoneyPipe],
})
export class PatrimonyComponent extends MyFinance implements OnInit {
  constructor(private dialog: Dialog) {
    super();
  }

  activeTab: 'assets' | 'debts' | 'history' = 'assets';
  historySubTab: 'all' | 'assets' | 'debts' = 'all';

  summary = {
    totalBankBalance: 0,
    totalAssets: 0,
    totalDebts: 0,
    netWorth: 0,
    assetCount: 0,
    debtCount: 0,
    disposedAssetCount: 0,
    settledDebtCount: 0,
    historyCount: 0,
  };
  summaryLoading = true;

  assetsPagination: TPagination = ResetPagination;
  assetsLoading = true;
  assetsShowFilters = false;
  assetsFilters = {
    name: '',
    type: '',
  };

  debtsPagination: TPagination = ResetPagination;
  debtsLoading = true;
  debtsShowFilters = false;
  debtsFilters = {
    name: '',
    type: '',
  };

  historyAssetsPagination: TPagination = ResetPagination;
  historyDebtsPagination: TPagination = ResetPagination;
  historyAssetsLoading = false;
  historyDebtsLoading = false;

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadSummary(),
      this.loadAssets(1),
      this.loadDebts(1),
    ]);
  }

  async loadSummary() {
    this.summaryLoading = true;
    this.cdr.markForCheck();
    try {
      const res = await api.get('/patrimony/summary');
      const payload = res.data?.data ?? res.data;
      if (payload) {
        this.summary = {
          totalBankBalance: Number(payload.totalBankBalance ?? 0),
          totalAssets: Number(payload.totalAssets ?? 0),
          totalDebts: Number(payload.totalDebts ?? 0),
          netWorth: Number(payload.netWorth ?? 0),
          assetCount: Number(payload.assetCount ?? 0),
          debtCount: Number(payload.debtCount ?? 0),
          disposedAssetCount: Number(payload.disposedAssetCount ?? 0),
          settledDebtCount: Number(payload.settledDebtCount ?? 0),
          historyCount: Number(payload.historyCount ?? (Number(payload.disposedAssetCount ?? 0) + Number(payload.settledDebtCount ?? 0))),
        };
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.summaryLoading = false;
      this.cdr.markForCheck();
    }
  }

  async loadAssets(page: number) {
    this.assetsLoading = true;
    this.cdr.markForCheck();
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        status: 'active',
        pageNumber: String(page),
        pageSize: '10',
      });

      if (this.assetsFilters.name.trim()) params.append('regex$name', this.assetsFilters.name.trim());
      if (this.assetsFilters.type) params.append('type', this.assetsFilters.type);

      const { data } = await api.get(`/assets?${params.toString()}`);
      this.assetsPagination = data.data;

      if (this.summary.totalAssets === 0 && this.assetsPagination?.data?.length > 0) {
        const activeItems = this.assetsPagination.data.filter((item: any) => !item.disposed);
        const sum = activeItems.reduce((acc: number, item: any) => acc + (Number(item.currentValue) || 0), 0);
        this.summary.totalAssets = sum;
        this.summary.assetCount = activeItems.length;
        this.summary.netWorth = this.summary.totalBankBalance + this.summary.totalAssets - this.summary.totalDebts;
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.assetsLoading = false;
      this.cdr.markForCheck();
    }
  }

  async loadDebts(page: number) {
    this.debtsLoading = true;
    this.cdr.markForCheck();
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        pageNumber: String(page),
        pageSize: '20',
      });

      if (this.debtsFilters.name.trim()) params.append('regex$name', this.debtsFilters.name.trim());
      if (this.debtsFilters.type) params.append('type', this.debtsFilters.type);

      const { data } = await api.get(`/debts?${params.toString()}`);
      const rawPagination = data?.data ?? ResetPagination;
      const allItems: any[] = rawPagination?.data ?? [];

      const activeItems = allItems.filter(
        (item: any) => !item.settled && (item.remainingAmount === undefined || Number(item.remainingAmount) > 0)
      );

      this.debtsPagination = {
        ...rawPagination,
        data: activeItems,
        totalCount: activeItems.length,
      };

      if (this.summary.totalDebts === 0 && this.debtsPagination?.data?.length > 0) {
        const sum = this.debtsPagination.data.reduce((acc: number, item: any) => acc + (Number(item.remainingAmount) || 0), 0);
        this.summary.totalDebts = sum;
        this.summary.debtCount = this.debtsPagination.totalCount || this.debtsPagination.data.length;
        this.summary.netWorth = this.summary.totalBankBalance + this.summary.totalAssets - this.summary.totalDebts;
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.debtsLoading = false;
      this.cdr.markForCheck();
    }
  }

  async loadHistoryAssets(page: number) {
    this.historyAssetsLoading = true;
    this.cdr.markForCheck();
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        status: 'disposed',
        pageNumber: String(page),
        pageSize: '10',
      });
      const { data } = await api.get(`/assets?${params.toString()}`);
      this.historyAssetsPagination = data.data;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.historyAssetsLoading = false;
      this.cdr.markForCheck();
    }
  }

  async loadHistoryDebts(page: number) {
    this.historyDebtsLoading = true;
    this.cdr.markForCheck();
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        pageNumber: String(page),
        pageSize: '50',
      });
      const { data } = await api.get(`/debts?${params.toString()}`);
      const rawPagination = data?.data ?? ResetPagination;
      const allItems: any[] = rawPagination?.data ?? [];

      const settledItems = allItems.filter(
        (item: any) => item.settled === true || (item.remainingAmount !== undefined && Number(item.remainingAmount) <= 0)
      );

      this.historyDebtsPagination = {
        ...rawPagination,
        data: settledItems,
        totalCount: settledItems.length,
      };
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.historyDebtsLoading = false;
      this.cdr.markForCheck();
    }
  }

  setTab(tab: 'assets' | 'debts' | 'history') {
    this.activeTab = tab;
    if (tab === 'history') {
      this.loadHistoryAssets(1);
      this.loadHistoryDebts(1);
    }
  }

  setHistorySubTab(subTab: 'all' | 'assets' | 'debts') {
    this.historySubTab = subTab;
    this.cdr.markForCheck();
  }

  parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return new Date(`${clean}T12:00:00.000Z`);
  }

  getTypeAssetLabel(type: string): string {
    const map: Record<string, string> = {
      vehicle: 'Veículo',
      real_estate: 'Imóvel',
      investment: 'Investimento',
      equipment: 'Equipamento',
      other: 'Outro Ativo',
    };
    return map[type] || 'Outro';
  }

  getTypeDebtLabel(type: string): string {
    const map: Record<string, string> = {
      financing: 'Financiamento',
      personal_loan: 'Empréstimo',
      credit_card: 'Cartão de Crédito',
      family: 'Familiar / Terceiros',
      other: 'Outro Passivo',
    };
    return map[type] || 'Outro';
  }

  async reloadAll() {
    await Promise.all([
      this.loadSummary(),
      this.loadAssets(this.assetsPagination.currentPage || 1),
      this.loadDebts(this.debtsPagination.currentPage || 1),
      this.loadHistoryAssets(this.historyAssetsPagination.currentPage || 1),
      this.loadHistoryDebts(this.historyDebtsPagination.currentPage || 1),
    ]);
  }

  openAssetModal(id: string = '') {
    const ref = this.dialog.open(AssetModalComponent, { data: { id } });
    ref.closed.subscribe(async (res) => {
      if (res) await this.reloadAll();
    });
  }

  openDebtModal(id: string = '') {
    const ref = this.dialog.open(DebtModalComponent, { data: { id } });
    ref.closed.subscribe(async (res) => {
      if (res) await this.reloadAll();
    });
  }

  openPayModal(debt: any) {
    const ref = this.dialog.open(PayInstallmentModalComponent, { data: { debt } });
    ref.closed.subscribe(async (res) => {
      if (res) await this.reloadAll();
    });
  }

  openAssetValuationModal(asset: any) {
    const ref = this.dialog.open(AssetValuationModalComponent, { data: { asset } });
    ref.closed.subscribe(async (res) => {
      if (res) await this.reloadAll();
    });
  }

  openDisposeAssetModal(asset: any) {
    const ref = this.dialog.open(DisposeAssetModalComponent, { data: { asset } });
    ref.closed.subscribe(async (res) => {
      if (res) await this.reloadAll();
    });
  }

  async reactivateAsset(asset: any) {
    try {
      const result = await Swal.fire({
        title: 'Reativar bem?',
        text: `Deseja reativar "${asset.name}" no seu patrimônio ativo?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, reativar',
        cancelButtonText: 'Cancelar',
      });

      if (!result.isConfirmed) return;

      const { data } = await api.patch(`/assets/${asset.id}/reactivate`, {});
      this.toastSuccess(data?.message || 'Bem reativado com sucesso!');
      await this.reloadAll();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  openDebtHistoryModal(debt: any) {
    const ref = this.dialog.open(DebtHistoryModalComponent, { data: { debt } });
    ref.closed.subscribe(async (res) => {
      if (res) await this.reloadAll();
    });
  }

  async deleteAsset(id: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir bem?',
        text: 'Deseja realmente excluir este bem?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
      });

      if (!result.isConfirmed) return;

      await api.delete(`/assets/${id}`);
      this.toastSuccess('Bem excluído com sucesso!');
      await this.reloadAll();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async deleteDebt(id: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir dívida?',
        text: 'Deseja realmente excluir esta dívida?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
      });

      if (!result.isConfirmed) return;

      await api.delete(`/debts/${id}`);
      this.toastSuccess('Dívida excluída com sucesso!');
      await this.reloadAll();
    } catch (error) {
      this.normalizeErr(error);
    }
  }
}
