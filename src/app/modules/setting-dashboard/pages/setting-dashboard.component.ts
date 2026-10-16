import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { Dialog } from '@angular/cdk/dialog';
import { SettingDashboardModalComponent } from '../components/modal/setting-dashboard-modal.component';
import { ResetPagination, TPagination } from 'src/app/shared/models/pagination';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { MyFinance } from 'src/app/core/utils/my-finance.util';

@Component({
  selector: 'app-setting-dashboard',
  templateUrl: './setting-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, BreadcrumbComponent, ButtonComponent],
})
export class SettingDashboardComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: Dialog,
  ) {
    super();
  }

  pagination: TPagination = ResetPagination;
  totalPages: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadData(1);
  }

  async loadData(page: number) {
    try {
      const { data } = await api.get(`/dashboard?deleted=false&pageNumber=${page}&pageSize=10&orderBy=sequence`);
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
    const ref = this.dialog.open(SettingDashboardModalComponent, { data: { id } });

    ref.closed.subscribe(async (result) => {
      if (result) {
        await this.loadData(this.pagination.currentPage || 1);
      }
    });
  }

  async deleteConfirm(id: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir configuração?',
        text: 'Deseja realmente excluir a configuração do dashboard?',
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

      await api.delete(`/dashboard/${id}`);
      await this.loadData(1);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  normalizeMaxText(text: string, max: number) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}...` : text;
  }
}
