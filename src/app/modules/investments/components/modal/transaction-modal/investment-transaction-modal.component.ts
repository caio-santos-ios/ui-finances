import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-investment-transaction-modal',
  standalone: true,
  templateUrl: './investment-transaction-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent, NgxMaskDirective],
  providers: [provideNgxMask()],
})
export class InvestmentTransactionModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  isLoading = false;
  assets: any[] = [];
  banks: any[] = [];

  constructor(
    private dialogRef: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { transaction?: any; defaultAssetId?: string; defaultBrokerId?: string }
  ) {
    super();
  }

  get isEdit(): boolean {
    return !!this.dialogData?.transaction?.id;
  }

  get isBuyOrSell(): boolean {
    const k = this.form?.get('kind')?.value;
    return k === 'BUY' || k === 'SELL';
  }

  ngOnInit(): void {
    const tx = this.dialogData?.transaction;
    const defaultDate = tx?.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];

    this.form = this.formBuilder.group({
      kind: [tx?.kind || 'BUY', [Validators.required]],
      investmentAssetId: [tx?.investmentAssetId || this.dialogData?.defaultAssetId || '', [Validators.required]],
      brokerId: [tx?.brokerId || this.dialogData?.defaultBrokerId || '', [Validators.required]],
      date: [defaultDate, [Validators.required]],
      quantity: [tx?.quantity ? tx.quantity.toString() : ''],
      unitPrice: [tx?.unitPrice ? tx.unitPrice.toString() : ''],
      fees: [tx?.fees ? tx.fees.toString() : ''],
      amount: [tx?.amount ? tx.amount.toString() : '', [Validators.required]],
      notes: [tx?.notes || ''],
      createOperation: [false],
    });

    this.loadDependencies();
  }

  async loadDependencies() {
    try {
      const [assetsResp, banksResp] = await Promise.all([
        api.get('/investments/investment-assets'),
        api.get('/banks/select?deleted=false'),
      ]);
      this.assets = assetsResp.data?.data || [];
      this.banks = banksResp.data?.data || [];
      this.cdr.markForCheck();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  onKindChange() {
    this.recalculateTotal();
    this.cdr.markForCheck();
  }

  private parseMoney(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  }

  recalculateTotal() {
    if (!this.isBuyOrSell) return;

    const raw = this.form.value;
    const qty = parseFloat(raw.quantity) || 0;
    const unitPrice = this.parseMoney(raw.unitPrice);
    const fees = this.parseMoney(raw.fees);

    if (qty > 0 && unitPrice >= 0) {
      const total = raw.kind === 'BUY' ? (qty * unitPrice) + fees : Math.max(0, (qty * unitPrice) - fees);
      this.form.patchValue({ amount: total.toFixed(2).replace('.', ',') }, { emitEvent: false });
    }
  }

  async save() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      const raw = this.form.value;
      const qty = parseFloat(raw.quantity) || 0;
      const unitPrice = this.parseMoney(raw.unitPrice);
      const fees = this.parseMoney(raw.fees);
      const amount = this.parseMoney(raw.amount);

      const payload = {
        investmentAssetId: raw.investmentAssetId,
        brokerId: raw.brokerId,
        kind: raw.kind,
        date: `${raw.date}T12:00:00.000Z`,
        quantity: qty,
        unitPrice,
        fees,
        amount,
        notes: raw.notes || '',
        createOperation: !!raw.createOperation,
      };

      if (this.isEdit) {
        await api.put(`/investments/transactions/${this.dialogData.transaction.id}`, payload);
        this.toastSuccess('Movimentação atualizada com sucesso!');
      } else {
        await api.post('/investments/transactions', payload);
        this.toastSuccess('Movimentação registrada com sucesso!');
      }

      this.dialogRef.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  close() {
    this.dialogRef.close(false);
  }
}
