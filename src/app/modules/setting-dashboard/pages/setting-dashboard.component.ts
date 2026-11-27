import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Dialog } from '@angular/cdk/dialog';
import Swal from 'sweetalert2';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DashboardCardComponent } from 'src/app/modules/dashboard/components/dashboard-card/dashboard-card.component';
import { SettingDashboardModalComponent } from '../components/modal/setting-dashboard-modal.component';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';

@Component({
  selector: 'app-setting-dashboard',
  templateUrl: './setting-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DragDropModule, BreadcrumbComponent, ButtonComponent, DashboardCardComponent],
})
export class SettingDashboardComponent extends MyFinance implements OnInit {
  constructor(private dialog: Dialog) {
    super();
  }

  dashboards: any[] = [];
  filteredDashboards: any[] = [];
  loading = true;
  isReordering = false;
  showFilters = false;

  filters = {
    name: '',
    type: '',
    collection: '',
    startDate: '',
    endDate: '',
  };

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.name.trim() ||
      this.filters.type ||
      this.filters.collection ||
      this.filters.startDate ||
      this.filters.endDate
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.markForCheck();
  }

  applyFilters(): void {
    const nameTerm = this.filters.name.trim().toLowerCase();
    const startMs = this.filters.startDate ? Date.parse(`${this.filters.startDate}T00:00:00Z`) : null;
    const endMs = this.filters.endDate ? Date.parse(`${this.filters.endDate}T23:59:59Z`) : null;

    this.filteredDashboards = this.dashboards.filter((item) => {
      if (nameTerm && !String(item.name || '').toLowerCase().includes(nameTerm)) return false;
      if (this.filters.type && item.type !== this.filters.type) return false;
      if (this.filters.collection && item.collection !== this.filters.collection) return false;
      if (startMs || endMs) {
        const createdMs = item.createdAt ? Date.parse(item.createdAt) : NaN;
        if (isNaN(createdMs)) return false;
        if (startMs && createdMs < startMs) return false;
        if (endMs && createdMs > endMs) return false;
      }
      return true;
    });
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.filters = {
      name: '',
      type: '',
      collection: '',
      startDate: '',
      endDate: '',
    };
    this.applyFilters();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const { data } = await api.get('/dashboard/dash');
      const items: any[] = data?.data ?? [];
      this.dashboards = items.map((item, idx) => ({
        ...item,
        sequence: Number(item.sequence) || idx + 1,
        wrapperClass: this.buildCardWrapperClass(item.cardClass),
        renderItem: { ...item, cardClass: '' },
      }));
      this.applyFilters();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private buildCardWrapperClass(cardClass?: string): string {
    const raw = (cardClass || 'col-span-12 lg:col-span-6').trim();
    const parts: string[] = [raw];
    if (!/\bcol-span-/.test(raw)) parts.push('col-span-12 lg:col-span-6');
    if (!/\brounded-/.test(raw)) parts.push('rounded-xl');
    if (!/\bborder\b/.test(raw)) parts.push('border border-muted/20');
    if (!/\bbg-/.test(raw)) parts.push('bg-background');
    if (!/\bp-\d/.test(raw)) parts.push('p-4');
    return parts.join(' ');
  }

  async onDrop(event: CdkDragDrop<any[]>): Promise<void> {
    if (this.hasActiveFilters || this.isReordering) return;
    if (event.previousIndex === event.currentIndex) return;

    const previous = this.dashboards.map((d) => ({ ...d }));
    moveItemInArray(this.dashboards, event.previousIndex, event.currentIndex);
    this.dashboards.forEach((item, index) => {
      item.sequence = index + 1;
    });
    this.applyFilters();

    this.isReordering = true;
    this.cdr.markForCheck();
    try {
      const payload = {
        items: this.dashboards.map((item) => ({
          id: item.id,
          sequence: item.sequence,
        })),
      };
      await api.put('/dashboard/reorder', payload);
      this.toastSuccess('Sequência atualizada com sucesso.');
    } catch (error) {
      this.dashboards = previous;
      this.applyFilters();
      this.normalizeErr(error);
    } finally {
      this.isReordering = false;
      this.cdr.markForCheck();
    }
  }

  openModal(id: string = ''): void {
    const ref = this.dialog.open(SettingDashboardModalComponent, { data: { id } });

    ref.closed.subscribe(async (result) => {
      if (result) {
        await this.loadData();
      }
    });
  }

  async deleteConfirm(id: string): Promise<void> {
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

      const { data } = await api.delete(`/dashboard/${id}`);
      this.toastSuccess(data?.message || 'Configuração do dashboard excluída com sucesso.');
      await this.loadData();
    } catch (error) {
      this.normalizeErr(error);
    }
  }
}
