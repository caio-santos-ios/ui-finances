import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';

@Component({
  selector: 'app-pay-installment-modal',
  templateUrl: './pay-installment-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective, MoneyPipe],
})
export class PayInstallmentModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { debt: any },
  ) {
    super();
  }

  form!: FormGroup;
  banks: any[] = [];
  isLoading = false;

  get debt() {
    return this.dialogData?.debt ?? {};
  }

  async ngOnInit(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const defaultAmount = this.debt.installmentAmount > 0
      ? this.debt.installmentAmount
      : this.debt.remainingAmount;

    this.form = this.formBuilder.group({
      amount: [defaultAmount, [Validators.required]],
      interest: [0],
      bankId: [this.debt.bankId || ''],
      createExpenseOperation: [true],
      paymentDate: [today, [Validators.required]],
    });

    await this.loadBanks();
  }

  private toNumber(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  get totalAmount(): number {
    if (!this.form) return 0;
    const amount = this.toNumber(this.form.get('amount')?.value);
    const interest = this.toNumber(this.form.get('interest')?.value);
    return Math.round((amount + interest) * 100) / 100;
  }

  async loadBanks() {
    try {
      const { data } = await api.get('/banks/select?deleted=false');
      this.banks = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  close(result: boolean = false) {
    this.dialog.close(result);
  }

  private parseDate(val: any): string {
    if (!val || typeof val !== 'string' || !val.trim()) return new Date().toISOString();
    if (val.includes('T')) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    return `${val}T12:00:00.000Z`;
  }

  async confirmPayment() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os dados do pagamento.');
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.form.value;
      const amount = this.toNumber(raw.amount);
      const interest = this.toNumber(raw.interest);
      const payload = {
        amount,
        interest,
        bankId: raw.bankId,
        createExpenseOperation: !!raw.createExpenseOperation,
        paymentDate: this.parseDate(raw.paymentDate),
      };

      const { data } = await api.post(`/debts/${this.debt.id}/pay-installment`, payload);
      this.toastSuccess(data.message || 'Pagamento registrado com sucesso!');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
