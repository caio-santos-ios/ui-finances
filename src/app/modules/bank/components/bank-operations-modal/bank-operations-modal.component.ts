import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

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
  startDate = '';
  endDate = '';

  sortColumn: string = 'createdAt';
  sortDirection: 'asc' | 'desc' | '' = 'desc';

  constructor(
    private dialogRef: DialogRef,
    @Inject(DIALOG_DATA) public data: BankOperationsModalData,
  ) {
    super();
  }

  ngOnInit(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    this.startDate = `${year}-${month}-01`;
    this.endDate = `${year}-${month}-${day}`;

    this.loadOperations();
  }

  get sortedOperations(): any[] {
    const list = this.operations || [];
    if (this.sortColumn) {
      return this.sortData(list, this.sortColumn, this.sortColumn, this.sortDirection).list;
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
    await this.loadOperations();
  }

  async loadOperations(): Promise<void> {
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
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
