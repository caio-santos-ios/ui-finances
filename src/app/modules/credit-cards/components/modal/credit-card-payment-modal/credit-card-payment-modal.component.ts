import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgxMaskDirective } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import {
  CreditCardDto,
  CreditCardInvoiceDto,
  CreditCardService,
} from '../../../services/credit-card.service';

@Component({
  selector: 'app-credit-card-payment-modal',
  standalone: true,
  templateUrl: './credit-card-payment-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxMaskDirective, ButtonComponent, MoneyPipe],
})
export class CreditCardPaymentModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  banks: any[] = [];
  isLoading = false;

  get card(): CreditCardDto {
    return this.dialogData.card;
  }

  get invoice(): CreditCardInvoiceDto {
    return this.dialogData.invoice;
  }

  constructor(
    private dialogRef: DialogRef<boolean>,
    private creditCardService: CreditCardService,
    @Inject(DIALOG_DATA) public dialogData: { card: CreditCardDto; invoice: CreditCardInvoiceDto },
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    this.form = this.formBuilder.group({
      paymentBankId: [this.card.bankId || ''],
      value: [this.invoice.totalAmount || 0, [Validators.required]],
      paidAt: [today, [Validators.required]],
      createExpenseOperation: [true],
    });

    await this.loadBanks();
  }

  async loadBanks(): Promise<void> {
    try {
      const { data } = await api.get('/banks/select?deleted=false');
      this.banks = data?.data ?? [];
      if (!this.form.get('paymentBankId')?.value && this.banks.length > 0) {
        this.form.patchValue({ paymentBankId: this.banks[0].id });
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  close(result: boolean = false): void {
    this.dialogRef.close(result);
  }

  async confirmPay(): Promise<void> {
    if (this.isLoading) return;
    if (this.form.invalid) {
      this.toastWarning('Selecione a conta bancária e informe a data do pagamento.');
      return;
    }

    try {
      const raw = this.form.value;
      const valStr = String(raw.value ?? '').replace(/R\$\s?/g, '').trim();
      const val = typeof raw.value === 'number'
        ? raw.value
        : Number(valStr.includes(',') ? valStr.replace(/\./g, '').replace(',', '.') : valStr);

      if (isNaN(val) || val <= 0) {
        this.toastWarning('O valor pago deve ser maior que zero.');
        return;
      }

      if (raw.createExpenseOperation && !raw.paymentBankId) {
        this.toastWarning('Selecione a conta bancária de débito para lançar a despesa.');
        return;
      }

      this.isLoading = true;
      this.cdr.markForCheck();

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8);
      const paidAtIso = raw.paidAt.includes('T') ? raw.paidAt : `${raw.paidAt}T${currentTime}Z`;

      await this.creditCardService.payInvoice(this.card.id, this.invoice.id, {
        paymentBankId: raw.paymentBankId || null,
        paidAt: paidAtIso,
        value: val,
        createExpenseOperation: !!raw.createExpenseOperation,
      });

      this.toastSuccess(
        raw.createExpenseOperation
          ? 'Fatura paga com sucesso! O limite foi liberado e a despesa registrada.'
          : 'Fatura marcada como paga e limite liberado com sucesso!'
      );
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
