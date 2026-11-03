import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-asset-modal',
  templateUrl: './asset-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective],
})
export class AssetModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
  ) {
    super();
  }

  form!: FormGroup;
  asset: any = {};
  isLoading = false;

  get isEdit() {
    return !!this.dialogData?.id;
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      type: ['other', [Validators.required]],
      purchaseValue: [null],
      currentValue: [null, [Validators.required]],
      acquisitionDate: [''],
      description: [''],
    });

    if (this.dialogData?.id) {
      await this.getById(this.dialogData.id);
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/assets/${id}`);
      this.asset = data.data;
      const formattedDate = this.asset.acquisitionDate ? this.asset.acquisitionDate.split('T')[0] : '';
      this.form.patchValue({
        ...this.asset,
        acquisitionDate: formattedDate,
      });
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  close(result: boolean = false) {
    this.dialog.close(result);
  }

  private parseMoney(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/R\$\s?/g, '').trim();
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private parseDate(val: any): string | null {
    if (!val || typeof val !== 'string' || !val.trim()) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  async create() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.form.value;
      const payload = {
        ...raw,
        purchaseValue: this.parseMoney(raw.purchaseValue),
        currentValue: this.parseMoney(raw.currentValue),
        acquisitionDate: this.parseDate(raw.acquisitionDate),
      };

      const { data } = await api.post('/assets', payload);
      this.toastSuccess(data.message || 'Bem cadastrado com sucesso!');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async update() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.form.value;
      const payload = {
        ...raw,
        id: this.dialogData.id,
        purchaseValue: this.parseMoney(raw.purchaseValue),
        currentValue: this.parseMoney(raw.currentValue),
        acquisitionDate: this.parseDate(raw.acquisitionDate),
      };

      const { data } = await api.put('/assets', payload);
      this.toastSuccess(data.message || 'Bem atualizado com sucesso!');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
