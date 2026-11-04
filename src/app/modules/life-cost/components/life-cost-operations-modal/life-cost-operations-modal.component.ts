import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

export interface LifeCostOperationsModalData {
  year: number;
  month: number;
  monthLabel: string;
  type: string;
  typeLabel: string;
}

@Component({
  selector: 'app-life-cost-operations-modal',
  standalone: true,
  templateUrl: './life-cost-operations-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent, MoneyPipe],
})
export class LifeCostOperationsModalComponent extends MyFinance implements OnInit {
  operations: any[] = [];
  isLoading = false;

  constructor(
    private dialogRef: DialogRef,
    @Inject(DIALOG_DATA) public data: LifeCostOperationsModalData,
  ) {
    super();
  }

  get totalValue(): number {
    return this.operations.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }

  ngOnInit(): void {
    this.loadOperations();
  }

  async loadOperations() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();
      const { data } = await api.get('/life-cost/monthly/operations', {
        params: {
          year: this.data.year,
          month: this.data.month,
          type: this.data.type,
        },
      });
      this.operations = data?.data || [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  close() {
    this.dialogRef.close();
  }
}
