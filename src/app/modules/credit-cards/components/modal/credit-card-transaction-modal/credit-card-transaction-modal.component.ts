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
  CreditCardService,
  CreditCardTransactionDto,
} from '../../../services/credit-card.service';

@Component({
  selector: 'app-credit-card-transaction-modal',
  standalone: true,
  templateUrl: './credit-card-transaction-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxMaskDirective, ButtonComponent, MoneyPipe],
})
export class CreditCardTransactionModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  categories: any[] = [];
  isLoading = false;

  installmentOptions = Array.from({ length: 36 }, (_, i) => i + 1);

  get isEdit(): boolean {
    return !!this.dialogData?.transaction?.id;
  }

  get cards(): CreditCardDto[] {
    return this.dialogData?.cards ?? [];
  }

  constructor(
    private dialogRef: DialogRef<boolean>,
    private creditCardService: CreditCardService,
    @Inject(DIALOG_DATA) public dialogData: {
      cards: CreditCardDto[];
      defaultCardId?: string;
      transaction?: CreditCardTransactionDto;
    },
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    const tx = this.dialogData?.transaction;
    const today = new Date().toISOString().split('T')[0];
    const txDate = tx?.date ? String(tx.date).split('T')[0] : today;

    this.form = this.formBuilder.group({
      creditCardId: [tx?.creditCardId || this.dialogData?.defaultCardId || this.cards[0]?.id || '', [Validators.required]],
      description: [tx?.description || '', [Validators.required]],
      value: [tx?.value ?? '', [Validators.required]],
      categoryId: [tx?.categoryId || ''],
      date: [txDate, [Validators.required]],
      installments: [tx?.totalInstallments || 1, [Validators.required, Validators.min(1), Validators.max(36)]],
    });

    await this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    try {
      const { data } = await api.get('/categories/select?deleted=false&type=expense');
      this.categories = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private toNumber(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/R\$\s?/g, '').trim();
    const cleaned = str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str;
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  get installmentPreviewValue(): number {
    const val = this.toNumber(this.form?.get('value')?.value);
    const inst = Number(this.form?.get('installments')?.value) || 1;
    if (val <= 0 || inst <= 0) return 0;
    return val / inst;
  }

  get installmentCount(): number {
    return Number(this.form?.get('installments')?.value) || 1;
  }

  close(result: boolean = false): void {
    this.dialogRef.close(result);
  }

  async save(): Promise<void> {
    if (this.isLoading) return;
    if (this.form.invalid) {
      this.toastWarning('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      const raw = this.form.value;
      const val = this.toNumber(raw.value);
      if (val <= 0) {
        this.toastWarning('O valor deve ser maior que zero.');
        return;
      }

      const dateIso = raw.date.includes('T') ? raw.date : `${raw.date}T12:00:00.000Z`;

      if (this.isEdit) {
        const tx = this.dialogData.transaction!;
        await this.creditCardService.updateTransaction(tx.creditCardId, tx.id, {
          description: raw.description?.trim(),
          value: val,
          categoryId: raw.categoryId || null,
          date: dateIso,
        });
        this.toastSuccess('Compra atualizada com sucesso!');
      } else {
        await this.creditCardService.createTransaction(raw.creditCardId, {
          description: raw.description?.trim(),
          value: val,
          categoryId: raw.categoryId || null,
          date: dateIso,
          installments: Number(raw.installments) || 1,
        });
        const inst = Number(raw.installments) || 1;
        this.toastSuccess(inst > 1 ? `Compra parcelada em ${inst}x lançada com sucesso!` : 'Compra lançada com sucesso!');
      }

      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
