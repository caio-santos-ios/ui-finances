import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgxMaskDirective } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { CreditCardDto, CreditCardService } from '../../../services/credit-card.service';

@Component({
  selector: 'app-credit-card-modal',
  standalone: true,
  templateUrl: './credit-card-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxMaskDirective, ButtonComponent],
})
export class CreditCardModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  banks: any[] = [];
  isLoading = false;

  brands = ['Mastercard', 'Visa', 'Elo', 'Amex', 'Hipercard'];
  presetColors = [
    '#820ad1', // Nubank
    '#ff7a00', // Inter
    '#ec7000', // Itaú
    '#cc092f', // Bradesco / Santander
    '#11c76f', // PicPay
    '#009ee3', // Mercado Pago
    '#1e293b', // Black / C6
    '#0f766e', // Verde Petróleo
  ];

  get isEdit(): boolean {
    return !!this.dialogData?.card?.id;
  }

  constructor(
    private dialogRef: DialogRef<boolean>,
    private creditCardService: CreditCardService,
    @Inject(DIALOG_DATA) public dialogData: { card?: CreditCardDto },
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    const c = this.dialogData?.card;
    this.form = this.formBuilder.group({
      name: [c?.name || '', [Validators.required]],
      bankId: [c?.bankId || ''],
      brand: [c?.brand || 'Mastercard', [Validators.required]],
      limit: [c?.limit ?? '', [Validators.required]],
      closingDay: [c?.closingDay ?? 1, [Validators.required, Validators.min(1), Validators.max(31)]],
      dueDay: [c?.dueDay ?? 10, [Validators.required, Validators.min(1), Validators.max(31)]],
      color: [c?.color || '#820ad1'],
      lastDigits: [c?.lastDigits || '', [Validators.maxLength(4)]],
    });

    await this.loadBanks();
  }

  async loadBanks(): Promise<void> {
    try {
      const { data } = await api.get('/banks/select?deleted=false');
      this.banks = data?.data ?? [];
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  selectColor(hex: string): void {
    this.form.patchValue({ color: hex });
    this.cdr.markForCheck();
  }

  close(result: boolean = false): void {
    this.dialogRef.close(result);
  }

  async save(): Promise<void> {
    if (this.isLoading) return;
    if (this.form.invalid) {
      this.toastWarning('Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      const raw = this.form.value;
      const limitNum = typeof raw.limit === 'number'
        ? raw.limit
        : Number(String(raw.limit).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim());

      const payload = {
        name: raw.name?.trim(),
        bankId: raw.bankId || null,
        brand: raw.brand,
        limit: limitNum,
        closingDay: Number(raw.closingDay),
        dueDay: Number(raw.dueDay),
        color: raw.color || '#820ad1',
        lastDigits: raw.lastDigits ? String(raw.lastDigits).replace(/\D/g, '').slice(0, 4) : null,
      };

      if (this.isEdit) {
        await this.creditCardService.update(this.dialogData.card!.id, payload);
        this.toastSuccess('Cartão atualizado com sucesso!');
      } else {
        await this.creditCardService.create(payload);
        this.toastSuccess('Cartão cadastrado com sucesso!');
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
