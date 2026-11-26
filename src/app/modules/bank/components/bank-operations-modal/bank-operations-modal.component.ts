import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import Swal from 'sweetalert2';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { OperationModalComponent } from 'src/app/modules/operation/components/modal/operation-modal.component';

export interface BankOperationsModalData {
  bankId: string;
  bankName: string;
  balance?: number;
}

@Component({
  selector: 'app-bank-operations-modal',
  standalone: true,
  templateUrl: './bank-operations-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, MoneyPipe],
})
export class BankOperationsModalComponent extends MyFinance implements OnInit {
  operations: any[] = [];
  isLoading = false;
  hasChanged = false;
  startDate = '';
  endDate = '';

  sortColumn: string = 'createdAt';
  sortDirection: 'asc' | 'desc' | '' = 'desc';

  constructor(
    private dialogRef: DialogRef<boolean>,
    private dialog: Dialog,
    @Inject(DIALOG_DATA) public data: BankOperationsModalData,
  ) {
    super();
  }

  ngOnInit(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadOperations(true);
  }

  get sortedOperations(): any[] {
    const list = this.operations || [];
    if (this.sortColumn) {
      const inverted = this.sortDirection === 'desc' ? 'asc' : 'desc';
      return this.sortData(list, this.sortColumn, this.sortColumn, inverted).list;
    }
    return list;
  }

  isInflow(op: any): boolean {
    if (op.type === 'income') return true;
    if (op.type === 'transfer' && op.destinationBankId === this.data.bankId) return true;
    return false;
  }

  get totalInflow(): number {
    return this.operations
      .filter((op) => this.isInflow(op))
      .reduce((acc, op) => acc + (Number(op.value) || 0), 0);
  }

  get totalOutflow(): number {
    return this.operations
      .filter((op) => !this.isInflow(op))
      .reduce((acc, op) => acc + (Number(op.value) || 0), 0);
  }

  get periodNet(): number {
    return this.totalInflow - this.totalOutflow;
  }

  onSort(column: string): void {
    this.sortDirection =
      this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortColumn = column;
    this.cdr.markForCheck();
  }

  async applyFilters(): Promise<void> {
    await this.loadOperations();
  }

  async clearFilters(): Promise<void> {
    this.startDate = '';
    this.endDate = '';
    await this.loadOperations(true);
  }

  async loadOperations(autoFillDates: boolean = false): Promise<void> {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      const buildParams = (extra: Record<string, string>) => {
        const params = new URLSearchParams({
          deleted: 'false',
          pageNumber: '1',
          pageSize: '1000',
          ...extra,
        });
        if (this.startDate) params.append('gte$createdAt', this.startDate);
        if (this.endDate) params.append('lte$createdAt', this.endDate);
        return params.toString();
      };

      const [directRes, incomingTransferRes] = await Promise.all([
        api.get(`/operations?${buildParams({ bankId: this.data.bankId })}`),
        api.get(`/operations?${buildParams({ destinationBankId: this.data.bankId, type: 'transfer' })}`),
      ]);

      const directList: any[] = directRes.data?.data?.data ?? [];
      const incomingList: any[] = incomingTransferRes.data?.data?.data ?? [];

      const map = new Map<string, any>();
      for (const op of directList) map.set(op.id, op);
      for (const op of incomingList) map.set(op.id, op);

      this.operations = Array.from(map.values()).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );

      if (autoFillDates && this.operations.length > 0) {
        const latest = String(this.operations[0].createdAt || '').split('T')[0];
        const earliest = String(this.operations[this.operations.length - 1].createdAt || '').split('T')[0];
        if (earliest) this.startDate = earliest;
        if (latest) this.endDate = latest;
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  editOperation(id: string): void {
    const ref = this.dialog.open(OperationModalComponent, { data: { id } });
    ref.closed.subscribe(async (result) => {
      if (result) {
        this.hasChanged = true;
        await this.loadOperations();
      }
    });
  }

  async deleteOperation(id: string): Promise<void> {
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
      this.hasChanged = true;
      this.toastSuccess('Operação excluída com sucesso.');
      await this.loadOperations();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  close(): void {
    this.dialogRef.close(this.hasChanged);
  }
}
