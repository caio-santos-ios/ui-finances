import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

export interface BudgetCycleHistoryItem {
  cycleKey: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'normal' | 'warning' | 'exceeded';
}

@Component({
  selector: 'app-budget-history-modal',
  templateUrl: './budget-history-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent, MoneyPipe],
})
export class BudgetHistoryModalComponent extends MyFinance implements OnInit {
  loading = true;
  cycles: BudgetCycleHistoryItem[] = [];

  constructor(
    private dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public dialogData: { budgetId: string; budgetName: string; categoryName?: string; period?: string }
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await this.loadHistory();
  }

  close() {
    this.dialogRef.close(false);
  }

  async loadHistory() {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const { data } = await api.get(`/budgets/${this.dialogData.budgetId}/history`);
      this.cycles = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'exceeded':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'exceeded':
        return 'Estourado';
      case 'warning':
        return 'Atenção';
      default:
        return 'Normal';
    }
  }

  getProgressBarColorClass(status: string): string {
    switch (status) {
      case 'exceeded':
        return 'bg-rose-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  }

  getClampedPercentage(pct: number): number {
    if (!pct || pct < 0) return 0;
    return Math.min(pct, 100);
  }
}
