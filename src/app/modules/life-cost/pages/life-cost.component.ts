import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { CategoryClassificationModalComponent } from '../components/category-classification-modal/category-classification-modal.component';
import { LifeCostSettingsModalComponent } from '../components/life-cost-settings-modal/life-cost-settings-modal.component';

@Component({
  selector: 'app-life-cost',
  standalone: true,
  templateUrl: './life-cost.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, MoneyPipe],
})
export class LifeCostComponent extends MyFinance implements OnInit {
  activeTab: 'monthly' | 'breakdown' = 'monthly';
  isLoading = false;

  summary: any = {
    averageMonthlyCost: 0,
    averageEssentialCost: 0,
    averageDiscretionaryCost: 0,
    projectedAnnualCost: 0,
    dailyCost: 0,
    emergencyReserveMonths: 0,
    emergencyReserveTargetMonths: 6,
    emergencyReserveTargetAmount: 0,
    autonomyMonths: 0,
    financialFreedomNumber: 0,
    financialFreedomProgress: 0,
    liquidAssets: 0,
    netPatrimony: 0,
    monthsConsidered: 6,
    configuredWindowMonths: 6,
    unclassifiedCategoriesCount: 0,
    safeWithdrawalRate: 0.04,
    includeDebtPayments: false,
  };

  monthlySeries: any[] = [];
  breakdown: any[] = [];

  constructor(private dialog: Dialog) {
    super();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  async loadAll() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();
      await Promise.all([
        this.loadSummary(),
        this.loadMonthly(),
        this.loadBreakdown(),
      ]);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async loadSummary() {
    try {
      const { data } = await api.get('/life-cost/summary');
      if (data?.data) {
        this.summary = data.data;
      }
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async loadMonthly() {
    try {
      const { data } = await api.get('/life-cost/monthly?months=12');
      this.monthlySeries = data?.data || [];
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async loadBreakdown() {
    try {
      const { data } = await api.get('/life-cost/breakdown');
      this.breakdown = data?.data || [];
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  openClassificationModal() {
    const ref = this.dialog.open(CategoryClassificationModalComponent);
    ref.closed.subscribe(async (res) => {
      if (res) {
        await this.loadAll();
      }
    });
  }

  openSettingsModal() {
    const ref = this.dialog.open(LifeCostSettingsModalComponent);
    ref.closed.subscribe(async (res) => {
      if (res) {
        await this.loadAll();
      }
    });
  }
}
