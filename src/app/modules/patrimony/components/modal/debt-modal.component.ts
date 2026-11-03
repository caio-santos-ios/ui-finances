import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-debt-modal',
  templateUrl: './debt-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective],
})
export class DebtModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
  ) {
    super();
  }

  form!: FormGroup;
  debt: any = {};
  banks: any[] = [];
  isLoading = false;

  get isEdit() {
    return !!this.dialogData?.id;
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      type: ['financing', [Validators.required]],
      totalAmount: [null, [Validators.required]],
      remainingAmount: [null],
      installmentAmount: [null],
      totalInstallments: [1, [Validators.min(1)]],
      paidInstallments: [0, [Validators.min(0)]],
      dueDay: [10, [Validators.min(1), Validators.max(31)]],
      bankId: [''],
      description: [''],
    });

    await this.loadBanks();

    if (this.dialogData?.id) {
      await this.getById(this.dialogData.id);
    }
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

  async getById(id: string) {
    try {
      const { data } = await api.get(`/debts/${id}`);
      this.debt = data.data;
      this.form.patchValue({ ...this.debt });
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

  async create() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.form.value;
      const totalAmount = this.parseMoney(raw.totalAmount);
      const remainingAmount = raw.remainingAmount
        ? this.parseMoney(raw.remainingAmount)
        : totalAmount;
      const installmentAmount = raw.installmentAmount
        ? this.parseMoney(raw.installmentAmount)
        : 0;

      const payload = {
        ...raw,
        totalAmount,
        remainingAmount,
        installmentAmount,
        totalInstallments: Number(raw.totalInstallments) || 1,
        paidInstallments: Number(raw.paidInstallments) || 0,
        dueDay: Number(raw.dueDay) || 10,
      };

      const { data } = await api.post('/debts', payload);
      this.toastSuccess(data.message || 'Dívida cadastrada com sucesso!');
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
      const totalAmount = this.parseMoney(raw.totalAmount);
      const remainingAmount = raw.remainingAmount
        ? this.parseMoney(raw.remainingAmount)
        : totalAmount;
      const installmentAmount = raw.installmentAmount
        ? this.parseMoney(raw.installmentAmount)
        : 0;

      const payload = {
        ...raw,
        id: this.dialogData.id,
        totalAmount,
        remainingAmount,
        installmentAmount,
        totalInstallments: Number(raw.totalInstallments) || 1,
        paidInstallments: Number(raw.paidInstallments) || 0,
        dueDay: Number(raw.dueDay) || 10,
      };

      const { data } = await api.put('/debts', payload);
      this.toastSuccess(data.message || 'Dívida atualizada com sucesso!');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
