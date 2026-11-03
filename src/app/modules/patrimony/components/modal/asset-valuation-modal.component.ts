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
  selector: 'app-asset-valuation-modal',
  templateUrl: './asset-valuation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective, MoneyPipe],
})
export class AssetValuationModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { asset: any },
  ) {
    super();
  }

  form!: FormGroup;
  valuations: any[] = [];
  isLoading = false;
  isSaving = false;
  showAddForm = false;
  editingId: string | null = null;

  get asset() {
    return this.dialogData?.asset ?? {};
  }

  async ngOnInit(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    this.form = this.formBuilder.group({
      type: ['appreciation', [Validators.required]],
      mode: ['delta'],
      amount: [null],
      newValue: [null],
      date: [today, [Validators.required]],
      note: [''],
    });

    await this.loadValuations();
  }

  private parseMoney(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/R\$\s?/g, '').trim();
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  async loadValuations() {
    try {
      this.isLoading = true;
      const { data } = await api.get(`/assets/${this.asset.id}/valuations`);
      this.valuations = data?.data ?? (Array.isArray(data) ? data : []);
      if (this.valuations.length > 0) {
        this.asset.currentValue = this.valuations[0].currentValue;
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
      this.form.reset({
        type: 'appreciation',
        mode: 'delta',
        amount: null,
        newValue: null,
        date: new Date().toISOString().split('T')[0],
        note: '',
      });
      this.showAddForm = true;
    }
    this.cdr.markForCheck();
  }

  editValuation(item: any) {
    this.editingId = item.id;
    this.showAddForm = true;
    const formattedDate = item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0];
    this.form.patchValue({
      type: item.type,
      mode: 'delta',
      amount: item.amount,
      newValue: null,
      date: formattedDate,
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
    this.form.reset({
      type: 'appreciation',
      mode: 'delta',
      amount: null,
      newValue: null,
      date: new Date().toISOString().split('T')[0],
      note: '',
    });
    this.cdr.markForCheck();
  }

  async saveValuation(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.showAddForm) return;

    const raw = this.form.value;
    const mode = raw.mode;

    let amount = 0;
    let newValue: number | null = null;

    if (mode === 'newValue') {
      if (!raw.newValue) {
        this.toastWarning('Informe o novo valor atual do bem.');
        return;
      }
      newValue = this.parseMoney(raw.newValue);
    } else {
      if (!raw.amount) {
        this.toastWarning('Informe o valor da valorização/desvalorização.');
        return;
      }
      amount = this.parseMoney(raw.amount);
    }

    try {
      this.isSaving = true;
      const payload = {
        type: raw.type,
        amount,
        newValue,
        date: raw.date ? new Date(raw.date).toISOString() : new Date().toISOString(),
        note: raw.note,
      };

      if (this.editingId) {
        const { data } = await api.put(`/assets/${this.asset.id}/valuations/${this.editingId}`, payload);
        this.toastSuccess(data.message || 'Item atualizado com sucesso!');
      } else {
        const { data } = await api.post(`/assets/${this.asset.id}/valuations`, payload);
        this.toastSuccess(data.message || 'Lançamento registrado com sucesso!');
      }

      this.cancelForm();
      await this.loadValuations();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async deleteValuation(item: any) {
    try {
      const result = await Swal.fire({
        title: 'Excluir lançamento?',
        text: 'Deseja remover este registro de valorização? O valor do bem será recalculado.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
      });

      if (!result.isConfirmed) return;

      await api.delete(`/assets/${this.asset.id}/valuations/${item.id}`);
      this.toastSuccess('Registro excluído com sucesso!');
      await this.loadValuations();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }
}
