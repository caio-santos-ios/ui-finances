import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { Dialog } from '@angular/cdk/dialog';
import { BudgetModalComponent } from '../components/modal/budget-modal.component';
import { ResetPagination, TPagination } from 'src/app/shared/models/pagination';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, MoneyPipe],
})
export class BudgetComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: Dialog,
  ) {
    super();
  }

  pagination: TPagination = ResetPagination;
  totalPages: any[] = [];
  categories: any[] = [];
  showFilters = false;
  filters = {
    name: '',
    categoryId: '',
    startDate: '',
    endDate: '',
  };

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadCategories(),
      this.loadData(1),
    ]);
  }

  async loadCategories(): Promise<void> {
    try {
      const { data } = await api.get('/categories/select?deleted=false&type=expense');
      this.categories = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  async applyFilters(): Promise<void> {
    await this.loadData(1);
  }

  async clearFilters(): Promise<void> {
    this.filters = {
      name: '',
      categoryId: '',
      startDate: '',
      endDate: '',
    };
    await this.loadData(1);
  }

  async loadData(page: number) {
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        pageNumber: String(page),
        pageSize: '10',
      });

      if (this.filters.name.trim()) params.append('regex$name', this.filters.name.trim());
      if (this.filters.categoryId) params.append('categoryId', this.filters.categoryId);
      if (this.filters.startDate) params.append('gte$createdAt', this.filters.startDate);
      if (this.filters.endDate) params.append('lte$createdAt', this.filters.endDate);

      const { data } = await api.get(`/budgets?${params.toString()}`);
      this.pagination = data.data;
      const count = Number(this.pagination.totalPages) || 0;
      this.totalPages = Array.from({ length: count }, (_, i) => i + 1);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  onPageChange(page: number) {
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

  async openModal(id: string = '') {
    const ref = this.dialog.open(BudgetModalComponent, { data: { id } });

    ref.closed.subscribe(async (result) => {
      if (result) {
        await this.loadData(this.pagination.currentPage || 1);
      }
    });
  }

  async deleteConfirm(id: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir orçamento?',
        text: 'Deseja realmente excluir o orçamento?',
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

      await api.delete(`/budgets/${id}`);
      await this.loadData(1);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  normalizeMaxText(text: string, max: number) {
    return text.length > max ? `${text.slice(0, max)}...` : text;
  }
}
