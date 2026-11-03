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

  activeTab: 'assets' | 'debts' = 'assets';

  summary = {
    totalBankBalance: 0,
    totalAssets: 0,
    totalDebts: 0,
    netWorth: 0,
    assetCount: 0,
    debtCount: 0,
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
      const { data } = await api.get('/patrimony/summary');
      this.summary = data?.data ?? data;
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
        pageNumber: String(page),
        pageSize: '10',
      });

      if (this.assetsFilters.name.trim()) params.append('regex$name', this.assetsFilters.name.trim());
      if (this.assetsFilters.type) params.append('type', this.assetsFilters.type);

      const { data } = await api.get(`/assets?${params.toString()}`);
      this.assetsPagination = data.data;
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
        pageSize: '10',
      });

      if (this.debtsFilters.name.trim()) params.append('regex$name', this.debtsFilters.name.trim());
      if (this.debtsFilters.type) params.append('type', this.debtsFilters.type);

      const { data } = await api.get(`/debts?${params.toString()}`);
      this.debtsPagination = data.data;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.debtsLoading = false;
      this.cdr.markForCheck();
    }
  }

  setTab(tab: 'assets' | 'debts') {
    this.activeTab = tab;
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

  openAssetModal(id: string = '') {
    const ref = this.dialog.open(AssetModalComponent, { data: { id } });
    ref.closed.subscribe(async (res) => {
      if (res) {
        await Promise.all([this.loadAssets(this.assetsPagination.currentPage || 1), this.loadSummary()]);
      }
    });
  }

  openDebtModal(id: string = '') {
    const ref = this.dialog.open(DebtModalComponent, { data: { id } });
    ref.closed.subscribe(async (res) => {
      if (res) {
        await Promise.all([this.loadDebts(this.debtsPagination.currentPage || 1), this.loadSummary()]);
      }
    });
  }

  openPayModal(debt: any) {
    const ref = this.dialog.open(PayInstallmentModalComponent, { data: { debt } });
    ref.closed.subscribe(async (res) => {
      if (res) {
        await Promise.all([this.loadDebts(this.debtsPagination.currentPage || 1), this.loadSummary()]);
      }
    });
  }

  openAssetValuationModal(asset: any) {
    const ref = this.dialog.open(AssetValuationModalComponent, { data: { asset } });
    ref.closed.subscribe(async (res) => {
      if (res) {
        await Promise.all([this.loadAssets(this.assetsPagination.currentPage || 1), this.loadSummary()]);
      }
    });
  }

  openDebtHistoryModal(debt: any) {
    const ref = this.dialog.open(DebtHistoryModalComponent, { data: { debt } });
    ref.closed.subscribe(async (res) => {
      if (res) {
        await Promise.all([this.loadDebts(this.debtsPagination.currentPage || 1), this.loadSummary()]);
      }
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

      const currentPage = this.assetsPagination.currentPage || 1;
      const willBeEmpty = this.assetsPagination.data.length === 1 && currentPage > 1;
      const nextPage = willBeEmpty ? currentPage - 1 : currentPage;

      await Promise.all([this.loadAssets(nextPage), this.loadSummary()]);
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

      const currentPage = this.debtsPagination.currentPage || 1;
      const willBeEmpty = this.debtsPagination.data.length === 1 && currentPage > 1;
      const nextPage = willBeEmpty ? currentPage - 1 : currentPage;

      await Promise.all([this.loadDebts(nextPage), this.loadSummary()]);
    } catch (error) {
      this.normalizeErr(error);
    }
  }
}
