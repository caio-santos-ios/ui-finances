import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-tax',
  standalone: true,
  templateUrl: './tax.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, MoneyPipe],
})
export class TaxComponent extends MyFinance implements OnInit {
  baseYear: number = new Date().getFullYear() - 1;
  availableYears: number[] = [];
  activeTab: 'summary' | 'income' | 'deductions' | 'assets' | 'debts' | 'snapshots' = 'summary';

  isLoading = true;
  isExportingExcel = false;
  isExportingPdf = false;

  preview: any = {
    baseYear: this.baseYear,
    disclaimer: '',
    totalTaxableIncome: 0,
    totalExemptIncome: 0,
    totalExclusiveIncome: 0,
    totalDeductions: 0,
    totalAssetsCost: 0,
    totalDebtsBalance: 0,
    pendingCount: 0,
    pendings: [],
    taxableIncome: [],
    exemptIncome: [],
    exclusiveIncome: [],
    deductions: [],
    assets: [],
    debts: [],
  };

  snapshots: any[] = [];
  snapshotsLoading = false;

  constructor() {
    super();
    const current = new Date().getFullYear();
    this.availableYears = [current, current - 1, current - 2, current - 3, current - 4];
  }

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      const { data } = await api.get(`/tax/preview?baseYear=${this.baseYear}`);
      const payload = data?.data ?? data;
      if (payload) {
        this.preview = {
          ...payload,
          pendings: payload.pendings ?? [],
          taxableIncome: payload.taxableIncome ?? [],
          exemptIncome: payload.exemptIncome ?? [],
          exclusiveIncome: payload.exclusiveIncome ?? [],
          deductions: payload.deductions ?? [],
          assets: payload.assets ?? [],
          debts: payload.debts ?? [],
        };
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  setTab(tab: 'summary' | 'income' | 'deductions' | 'assets' | 'debts' | 'snapshots'): void {
    this.activeTab = tab;
    if (tab === 'snapshots') {
      this.loadSnapshots();
    }
    this.cdr.markForCheck();
  }

  async loadSnapshots(): Promise<void> {
    this.snapshotsLoading = true;
    this.cdr.markForCheck();
    try {
      const { data } = await api.get(`/tax/snapshots?baseYear=${this.baseYear}`);
      this.snapshots = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.snapshotsLoading = false;
      this.cdr.markForCheck();
    }
  }

  async exportExcel(): Promise<void> {
    if (this.isExportingExcel) return;
    this.isExportingExcel = true;
    this.cdr.markForCheck();
    try {
      const response = await api.get(`/tax/export?baseYear=${this.baseYear}&format=xlsx`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_IRPF_${this.baseYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.toastSuccess('Relatório Excel exportado com sucesso!');
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isExportingExcel = false;
      this.cdr.markForCheck();
    }
  }

  async exportPdf(): Promise<void> {
    if (this.isExportingPdf) return;
    this.isExportingPdf = true;
    this.cdr.markForCheck();
    try {
      const response = await api.get(`/tax/export?baseYear=${this.baseYear}&format=pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_IRPF_${this.baseYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.toastSuccess('Relatório PDF exportado com sucesso!');
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isExportingPdf = false;
      this.cdr.markForCheck();
    }
  }

  resolvePending(pending: any): void {
    if (pending.route) {
      this.router.navigate([pending.route]);
    }
  }

  getDeductionSubtypeLabel(subtype: string): string {
    const map: Record<string, string> = {
      health: 'Saúde / Despesas Médicas',
      education: 'Instrução / Educação',
      pension: 'Previdência Privada (PGBL)',
      dependent: 'Dependentes',
      alimony: 'Pensão Alimentícia',
      other: 'Outra Dedução',
    };
    return map[subtype] || 'Dedução Legal';
  }
}
