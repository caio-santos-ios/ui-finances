import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { Dialog } from '@angular/cdk/dialog';
import { OperationModalComponent } from '../components/modal/operation-modal.component';
import { ResetPagination, TPagination } from 'src/app/shared/models/pagination';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ButtonComponent, MoneyPipe],
})
export class OperationComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: Dialog,
  ) {
    super();
  }

  pagination: TPagination = ResetPagination;
  totalPages: any[] = [];
  categories: any[] = [];
  banks: any[] = [];
  loading = true;
  showFilters = false;
  filters = {
    description: '',
    categoryId: '',
    bankId: '',
    type: '',
    startDate: '',
    endDate: '',
  };
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadSelects(),
      this.loadData(1),
    ]);
  }

  async loadSelects(): Promise<void> {
    try {
      const [categoriesRes, banksRes] = await Promise.all([
        api.get('/categories/select?deleted=false'),
        api.get('/banks/select?deleted=false'),
      ]);
      this.categories = categoriesRes.data?.data ?? [];
      this.banks = banksRes.data?.data ?? [];
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
      description: '',
      categoryId: '',
      bankId: '',
      type: '',
      startDate: '',
      endDate: '',
    };
    await this.loadData(1);
  }

  async loadData(page: number) {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const params = new URLSearchParams({
        deleted: 'false',
        pageNumber: String(page),
        pageSize: '10',
      });

      if (this.filters.description.trim()) params.append('regex$description', this.filters.description.trim());
      if (this.filters.categoryId) params.append('categoryId', this.filters.categoryId);
      if (this.filters.bankId) params.append('bankId', this.filters.bankId);
      if (this.filters.type) params.append('type', this.filters.type);
      if (this.filters.startDate) params.append('gte$createdAt', this.filters.startDate);
      if (this.filters.endDate) params.append('lte$createdAt', this.filters.endDate);

      const { data } = await api.get(`/operations?${params.toString()}`);
      this.pagination = data.data;
      if (this.sortColumn && this.pagination.data?.length) {
        const res = this.sortData(this.pagination.data, this.sortColumn, '', this.sortDirection);
        this.pagination.data = res.list;
      }
      const count = Number(this.pagination.totalPages) || 0;
      this.totalPages = Array.from({ length: count }, (_, i) => i + 1);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.currentPage) return;
    this.loadData(page);
  }

  onSort(column: string) {
    if (!this.pagination.data?.length) return;
    const res = this.sortData(this.pagination.data, column, this.sortColumn, this.sortDirection);
    this.pagination.data = res.list;
    this.sortColumn = res.column;
    this.sortDirection = res.direction;
    this.cdr.markForCheck();
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

  duplicatingId: string | null = null;

  async duplicateOperation(item: any) {
    if (!item?.id || this.duplicatingId) return;
    this.duplicatingId = item.id;
    this.cdr.markForCheck();
    try {
      const now = new Date();
      const fallbackDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${now.toTimeString().slice(0, 5)}:00Z`;

      const body = {
        type: item.type,
        categoryId: item.categoryId || '',
        bankId: item.bankId || '',
        destinationBankId: item.destinationBankId || '',
        value: Number(item.value) || 0,
        createdAt: item.createdAt || fallbackDate,
        description: item.description || '',
        repeat: !!item.repeat,
        recurrence: item.repeat ? (item.recurrence || '') : '',
        payeeName: item.payeeName || '',
        payeeDocument: item.payeeDocument || '',
      };

      await api.post('/operations', body);
      this.toastSuccess('Operação duplicada com sucesso.');
      await this.loadData(this.pagination.currentPage || 1);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.duplicatingId = null;
      this.cdr.markForCheck();
    }
  }

  async openModal(id: string = '') {
    const ref = this.dialog.open(OperationModalComponent, { data: { id } });

    ref.closed.subscribe(async (result) => {
      if (result) {
        await this.loadData(this.pagination.currentPage || 1);
      }
    });
  }

  async deleteConfirm(id: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir operação?',
        text: 'Deseja realmente excluir a operação?',
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

      await api.delete(`/operations/${id}`);
      const isLastItemOnPage = this.pagination.data?.length === 1;
      const targetPage = isLastItemOnPage && this.pagination.currentPage > 1
        ? this.pagination.currentPage - 1
        : (this.pagination.currentPage || 1);
      await this.loadData(targetPage);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  normalizeMaxText(text: string, max: number) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}...` : text;
  }
}
