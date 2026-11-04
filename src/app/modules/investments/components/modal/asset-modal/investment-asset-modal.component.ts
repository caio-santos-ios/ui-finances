import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-investment-asset-modal',
  standalone: true,
  templateUrl: './investment-asset-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent, NgxMaskDirective],
  providers: [provideNgxMask()],
})
export class InvestmentAssetModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  isLoading = false;

  constructor(
    private dialogRef: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { asset?: any }
  ) {
    super();
  }

  get isEdit(): boolean {
    return !!this.dialogData?.asset?.id;
  }

  ngOnInit(): void {
    const a = this.dialogData?.asset;
    this.form = this.formBuilder.group({
      type: [a?.type || 'STOCK', [Validators.required]],
      ticker: [a?.ticker || ''],
      name: [a?.name || '', [Validators.required]],
      manualPrice: [a?.manualPrice ? a.manualPrice.toString() : ''],
      contractedRate: [a?.contractedRate ? (a.contractedRate * 100).toString() : ''],
      maturityDate: [a?.maturityDate ? a.maturityDate.split('T')[0] : ''],
    });
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

  async save() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      const raw = this.form.value;
      const rateVal = raw.contractedRate ? parseFloat(raw.contractedRate) / 100 : null;

      const payload = {
        ticker: raw.ticker?.trim() || '',
        name: raw.name.trim(),
        type: raw.type,
        currency: 'BRL',
        manualPrice: this.parseMoney(raw.manualPrice),
        contractedRate: rateVal,
        maturityDate: raw.maturityDate ? `${raw.maturityDate}T12:00:00.000Z` : null,
      };

      if (this.isEdit) {
        await api.put(`/investments/investment-assets/${this.dialogData.asset.id}`, payload);
        this.toastSuccess('Ativo atualizado com sucesso!');
      } else {
        await api.post('/investments/investment-assets', payload);
        this.toastSuccess('Ativo cadastrado com sucesso!');
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
