import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { GoalModalComponent } from '../components/modal/goal-modal.component';
import { GoalDepositModalComponent } from '../components/modal/goal-deposit-modal.component';
import { GoalHistoryModalComponent } from '../components/modal/goal-history-modal.component';
import { ResetPagination, TPagination } from 'src/app/shared/models/pagination';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, MoneyPipe],
})
export class GoalsComponent extends MyFinance implements OnInit {
  pagination: TPagination = ResetPagination;
  totalPages: any[] = [];
  loading = true;
  showFilters = false;
  activeTab: 'all' | 'in_progress' | 'completed' = 'all';

  filters = {
    name: '',
    status: '',
  };

  summary = {
    totalTarget: 0,
    totalCurrent: 0,
    completedCount: 0,
    inProgressCount: 0,
    totalGoals: 0,
    overallProgress: 0,
  };

  goals: any[] = [];

  constructor(private dialog: Dialog) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSummary(), this.loadData(1)]);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setTab(tab: 'all' | 'in_progress' | 'completed'): void {
    this.activeTab = tab;
    this.filters.status = tab === 'all' ? '' : tab;
    this.loadData(1);
  }

  async applyFilters(): Promise<void> {
    if (this.filters.status === 'in_progress') this.activeTab = 'in_progress';
    else if (this.filters.status === 'completed') this.activeTab = 'completed';
    else this.activeTab = 'all';
    await this.loadData(1);
  }

  async clearFilters(): Promise<void> {
    this.filters = {
      name: '',
      status: '',
    };
    this.activeTab = 'all';
    await this.loadData(1);
  }

  async loadSummary(): Promise<void> {
    try {
      const { data } = await api.get('/goals/summary');
      if (data?.data) {
        this.summary = {
          totalTarget: Number(data.data.totalTarget) || 0,
          totalCurrent: Number(data.data.totalCurrent) || 0,
          completedCount: Number(data.data.completedCount) || 0,
          inProgressCount: Number(data.data.inProgressCount) || 0,
          totalGoals: Number(data.data.totalGoals) || 0,
          overallProgress: Number(data.data.overallProgress) || 0,
        };
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async loadData(page: number): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        pageNumber: String(page),
        pageSize: '12',
      });

      if (this.filters.name.trim()) params.append('regex$name', this.filters.name.trim());
      if (this.filters.status) params.append('status', this.filters.status);

      const { data } = await api.get(`/goals?${params.toString()}`);
      this.pagination = data.data;
      this.goals = (data?.data?.data ?? []).map((goal: any) => {
        const target = Number(goal.targetAmount) || 0;
        const current = Number(goal.currentAmount) || 0;
        const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        const remaining = Math.max(0, target - current);
        const isCompleted = goal.status === 'completed' || current >= target;
        return {
          ...goal,
          targetAmount: target,
          currentAmount: current,
          percent,
          remaining,
          isCompleted,
        };
      });

      const count = Number(this.pagination.totalPages) || 0;
      this.totalPages = Array.from({ length: count }, (_, i) => i + 1);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.currentPage) return;
    this.loadData(page);
  }

  get pages(): (number | '...')[] {
    const { currentPage: c, totalPages: t } = this.pagination;
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);

    let start = Math.max(2, c - 1);
    let end = Math.min(t - 1, c + 1);
    if (c <= 3) end = 4;
    if (c >= t - 2) start = t - 3;

    const pages: (number | '...')[] = [1];
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < t - 1) pages.push('...');
    pages.push(t);

    return pages;
  }

  openModal(id: string = ''): void {
    const ref = this.dialog.open(GoalModalComponent, { data: { id } });
    ref.closed.subscribe(async (result) => {
      if (result) {
        await Promise.all([
          this.loadSummary(),
          this.loadData(this.pagination.currentPage || 1),
        ]);
      }
    });
  }

  openDepositModal(goal: any): void {
    const ref = this.dialog.open(GoalDepositModalComponent, {
      data: {
        goalId: goal.id,
        goalName: goal.name,
        currentAmount: goal.currentAmountNum,
        targetAmount: goal.targetAmountNum,
        color: goal.color,
      },
    });
    ref.closed.subscribe(async (result) => {
      if (result) {
        await Promise.all([
          this.loadSummary(),
          this.loadData(this.pagination.currentPage || 1),
        ]);
      }
    });
  }

  openHistoryModal(goal: any): void {
    const ref = this.dialog.open(GoalHistoryModalComponent, {
      data: {
        goalId: goal.id,
        goalName: goal.name,
      },
    });
    ref.closed.subscribe(async (result) => {
      if (result) {
        await Promise.all([
          this.loadSummary(),
          this.loadData(this.pagination.currentPage || 1),
        ]);
      }
    });
  }

  async deleteConfirm(id: string): Promise<void> {
    try {
      const result = await Swal.fire({
        title: 'Excluir meta?',
        text: 'Deseja realmente excluir esta meta?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Excluir',
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'bg-card text-foreground border border-border rounded-xl shadow-2xl',
          title: 'text-foreground font-semibold',
          htmlContainer: 'text-muted-foreground',
          confirmButton: 'bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
          cancelButton: 'bg-muted text-muted-foreground font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90',
          actions: 'gap-2',
        },
        buttonsStyling: false,
      });

      if (!result.isConfirmed) return;

      await api.delete(`/goals/${id}`);
      this.toastSuccess('Meta excluída com sucesso.');
      const isLastItemOnPage = this.goals.length === 1;
      const targetPage = isLastItemOnPage && this.pagination.currentPage > 1
        ? this.pagination.currentPage - 1
        : (this.pagination.currentPage || 1);

      await Promise.all([this.loadSummary(), this.loadData(targetPage)]);
    } catch (error) {
      this.normalizeErr(error);
    }
  }
}
