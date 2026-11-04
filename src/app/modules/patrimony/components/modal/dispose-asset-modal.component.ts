import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-dispose-asset-modal',
  templateUrl: './dispose-asset-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective],
})
export class DisposeAssetModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { asset: any },
  ) {
    super();
  }

  form!: FormGroup;
  asset: any = {};
  banks: any[] = [];
  isLoading = false;

  async ngOnInit(): Promise<void> {
    this.asset = this.dialogData?.asset ?? {};
    const today = new Date().toISOString().split('T')[0];

    this.form = this.formBuilder.group({
      disposalDate: [today, [Validators.required]],
      disposalValue: [this.asset.currentValue || null],
      disposalReason: ['Venda', [Validators.required]],
      createIncomeOperation: [false],
      bankId: [''],
    });

    await this.loadBanks();
  }

  private parseMoney(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/R\$\s?/g, '').trim();
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private parseDate(val: any): string {
    if (!val || typeof val !== 'string' || !val.trim()) return new Date().toISOString();
    if (val.includes('T')) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    return `${val}T12:00:00.000Z`;
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

  async confirmDispose() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    const raw = this.form.value;
    const disposalValue = this.parseMoney(raw.disposalValue);

    if (raw.createIncomeOperation && (!raw.bankId || disposalValue <= 0)) {
      this.toastWarning('Para registrar receita em conta, informe a conta bancária e um valor maior que zero.');
      return;
    }

    try {
      this.isLoading = true;
      const payload = {
        disposalDate: this.parseDate(raw.disposalDate),
        disposalValue,
        disposalReason: raw.disposalReason,
        bankId: raw.bankId || null,
        createIncomeOperation: !!raw.createIncomeOperation,
      };

      const { data } = await api.patch(`/assets/${this.asset.id}/dispose`, payload);
      this.toastSuccess(data.message || 'Desfazimento do bem registrado com sucesso!');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
