import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { InvestmentTransactionModalComponent } from '../transaction-modal/investment-transaction-modal.component';

@Component({
  selector: 'app-investment-asset-history-modal',
  standalone: true,
  templateUrl: './investment-asset-history-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent, MoneyPipe],
})
export class InvestmentAssetHistoryModalComponent extends MyFinance implements OnInit {
  asset: any;
  transactions: any[] = [];
  isLoading = false;

  constructor(
    private dialogRef: DialogRef,
    private dialog: Dialog,
    @Inject(DIALOG_DATA) public dialogData: { asset: any }
  ) {
    super();
    this.asset = dialogData.asset;
  }

  ngOnInit(): void {
    this.loadTransactions();
  }

  async loadTransactions() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();
      const { data } = await api.get(`/investments/transactions?assetId=${this.asset.id}`);
      this.transactions = data?.data || [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  openNewTransaction() {
    const ref = this.dialog.open(InvestmentTransactionModalComponent, {
      data: { defaultAssetId: this.asset.id },
    });
    ref.closed.subscribe((res) => {
      if (res) this.loadTransactions();
    });
  }

  editTransaction(tx: any) {
    const ref = this.dialog.open(InvestmentTransactionModalComponent, {
      data: { transaction: tx, defaultAssetId: this.asset.id },
    });
    ref.closed.subscribe((res) => {
      if (res) this.loadTransactions();
    });
  }

  async deleteTransaction(id: string) {
    const result = await Swal.fire({
      title: 'Excluir movimentação?',
      text: 'Deseja realmente excluir esta movimentação? A posição do ativo será recalculada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/investments/transactions/${id}`);
      this.toastSuccess('Movimentação excluída com sucesso!');
      await this.loadTransactions();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  close(result: boolean = false) {
    this.dialogRef.close(result);
  }
}
