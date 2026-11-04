import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-life-cost-settings-modal',
  standalone: true,
  templateUrl: './life-cost-settings-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent, NgxMaskDirective, MoneyPipe],
  providers: [provideNgxMask()],
})
export class LifeCostSettingsModalComponent extends MyFinance implements OnInit {
  settings: any = {
    averageWindowMonths: 6,
    safeWithdrawalRate: 0.04,
    emergencyReserveTargetMonths: 6,
    includeDebtPayments: false,
    monthlyAdjustments: [],
  };

  monthsList = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  newAdjustment: any = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: '',
    reason: '',
  };

  showAddAdjustment = false;
  isLoading = false;
  isSaving = false;
  isAddingAdjustment = false;

  constructor(private dialogRef: DialogRef) {
    super();
  }

  ngOnInit(): void {
    this.loadSettings();
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

  async loadSettings() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();
      const { data } = await api.get('/life-cost/settings');
      if (data?.data) {
        this.settings = data.data;
      }
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async saveSettings() {
    try {
      this.isSaving = true;
      this.cdr.markForCheck();
      const payload = {
        averageWindowMonths: Number(this.settings.averageWindowMonths),
        safeWithdrawalRate: Number(this.settings.safeWithdrawalRate),
        emergencyReserveTargetMonths: Number(this.settings.emergencyReserveTargetMonths),
        includeDebtPayments: !!this.settings.includeDebtPayments,
      };
      await api.put('/life-cost/settings', payload);
      this.toastSuccess('Configurações salvas com sucesso!');
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async addAdjustment() {
    const amount = this.parseMoney(this.newAdjustment.amount);
    if (!amount || amount <= 0) {
      this.toastWarning('Informe um valor válido para o ajuste.');
      return;
    }
    if (!this.newAdjustment.reason?.trim()) {
      this.toastWarning('Informe o motivo do ajuste.');
      return;
    }

    try {
      this.isAddingAdjustment = true;
      this.cdr.markForCheck();
      const payload = {
        year: Number(this.newAdjustment.year),
        month: Number(this.newAdjustment.month),
        amount,
        reason: this.newAdjustment.reason.trim(),
      };
      await api.post('/life-cost/adjustments', payload);
      this.toastSuccess('Ajuste adicionado com sucesso!');
      this.showAddAdjustment = false;
      this.newAdjustment = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        amount: '',
        reason: '',
      };
      await this.loadSettings();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isAddingAdjustment = false;
      this.cdr.markForCheck();
    }
  }

  async deleteAdjustment(id: string) {
    const result = await Swal.fire({
      title: 'Excluir ajuste?',
      text: 'Deseja realmente excluir este ajuste extraordinário?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/life-cost/adjustments/${id}`);
      this.toastSuccess('Ajuste excluído com sucesso!');
      await this.loadSettings();
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  close(result: boolean = false) {
    this.dialogRef.close(result);
  }
}
