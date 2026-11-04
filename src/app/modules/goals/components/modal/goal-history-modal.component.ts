import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-goal-history-modal',
  templateUrl: './goal-history-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent, MoneyPipe],
})
export class GoalHistoryModalComponent extends MyFinance implements OnInit {
  loading = true;
  transactions: any[] = [];

  constructor(
    private dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public dialogData: { goalId: string; goalName: string }
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await this.loadTransactions();
  }

  close(result: boolean = false) {
    this.dialogRef.close(result);
  }

  async loadTransactions() {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const { data } = await api.get(`/goals/${this.dialogData.goalId}/transactions`);
      this.transactions = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async deleteTransaction(txId: string) {
    try {
      const result = await Swal.fire({
        title: 'Excluir movimentação?',
        text: 'O saldo da meta será recalculado automaticamente.',
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

      await api.delete(`/goals/${this.dialogData.goalId}/transactions/${txId}`);
      this.toastSuccess('Movimentação excluída com sucesso.');
      await this.loadTransactions();
    } catch (error) {
      this.normalizeErr(error);
    }
  }
}
