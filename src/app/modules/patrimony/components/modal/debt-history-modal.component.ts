import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-debt-history-modal',
  templateUrl: './debt-history-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective, MoneyPipe],
})
export class DebtHistoryModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { debt: any },
  ) {
    super();
  }

  form!: FormGroup;
  payments: any[] = [];
  banks: any[] = [];
  isLoading = false;
  isSaving = false;
  showAddForm = false;
  editingId: string | null = null;

  get debt() {
    return this.dialogData?.debt ?? {};
  }

  async ngOnInit(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const defaultAmount = this.debt.installmentAmount > 0
      ? this.debt.installmentAmount
      : this.debt.remainingAmount;

    this.form = this.formBuilder.group({
      type: ['installment', [Validators.required]],
      amount: [defaultAmount, [Validators.required]],
      installmentsCount: [1, [Validators.min(0)]],
      bankId: [this.debt.bankId || ''],
      createExpenseOperation: [true],
      paymentDate: [today, [Validators.required]],
      note: [''],
    });

    this.form.get('type')?.valueChanges.subscribe((type) => {
      if (type === 'amortization') {
        this.form.patchValue({ installmentsCount: 0 });
      } else {
        this.form.patchValue({ installmentsCount: 1 });
      }
    });

    await Promise.all([this.loadPayments(), this.loadBanks()]);
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

  async loadPayments() {
    try {
      this.isLoading = true;
      const { data } = await api.get(`/debts/${this.debt.id}/payments`);
      this.payments = data?.data ?? (Array.isArray(data) ? data : []);
      if (this.payments.length > 0) {
        this.debt.remainingAmount = this.payments[0].newRemainingAmount;
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  close(result: boolean = false) {
    this.dialog.close(result);
  }

  toggleAddForm() {
    if (this.showAddForm) {
      this.cancelForm();
    } else {
      this.editingId = null;
      const defaultAmount = this.debt.installmentAmount > 0
        ? this.debt.installmentAmount
        : this.debt.remainingAmount;

      this.form.reset({
        type: 'installment',
        amount: defaultAmount,
        installmentsCount: 1,
        bankId: this.debt.bankId || '',
        createExpenseOperation: true,
        paymentDate: new Date().toISOString().split('T')[0],
        note: '',
      });
      this.showAddForm = true;
    }
    this.cdr.markForCheck();
  }

  editPayment(item: any) {
    this.editingId = item.id;
    this.showAddForm = true;
    const formattedDate = item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0];
    this.form.patchValue({
      type: item.type,
      amount: item.amount,
      installmentsCount: item.installmentsCount,
      bankId: item.bankId || '',
      createExpenseOperation: false,
      paymentDate: formattedDate,
      note: item.note || '',
    });
    this.cdr.markForCheck();
  }

  cancelForm(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.editingId = null;
    this.showAddForm = false;
    const defaultAmount = this.debt.installmentAmount > 0
      ? this.debt.installmentAmount
      : this.debt.remainingAmount;

    this.form.reset({
      type: 'installment',
      amount: defaultAmount,
      installmentsCount: 1,
      bankId: this.debt.bankId || '',
      createExpenseOperation: true,
      paymentDate: new Date().toISOString().split('T')[0],
      note: '',
    });
    this.cdr.markForCheck();
  }

  async savePayment(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.showAddForm) return;

    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isSaving = true;
      const raw = this.form.value;
      const amount = this.parseMoney(raw.amount);
      const payload = {
        type: raw.type,
        amount,
        installmentsCount: Number(raw.installmentsCount || 0),
        bankId: raw.bankId || null,
        createExpenseOperation: !this.editingId && !!raw.createExpenseOperation,
        paymentDate: this.parseDate(raw.paymentDate),
        note: raw.note || (raw.type === 'amortization' ? 'Amortização avulsa' : `Pagamento de parcela`),
      };

      if (this.editingId) {
        const { data } = await api.put(`/debts/${this.debt.id}/payments/${this.editingId}`, payload);
        this.toastSuccess(data.message || 'Pagamento atualizado com sucesso!');
      } else {
        const { data } = await api.post(`/debts/${this.debt.id}/payments`, payload);
        this.toastSuccess(data.message || 'Lançamento registrado com sucesso!');
      }

      this.cancelForm();
      await this.loadPayments();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async deletePayment(item: any) {
    try {
      const result = await Swal.fire({
        title: 'Excluir pagamento?',
        text: 'Deseja remover este registro? O saldo devedor e parcelas serão recalculados.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
      });

      if (!result.isConfirmed) return;

      await api.delete(`/debts/${this.debt.id}/payments/${item.id}`);
      this.toastSuccess('Pagamento excluído com sucesso!');
      await this.loadPayments();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }
}
