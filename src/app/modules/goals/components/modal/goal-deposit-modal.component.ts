import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NgxMaskDirective } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-goal-deposit-modal',
  templateUrl: './goal-deposit-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxMaskDirective, ButtonComponent, MoneyPipe],
})
export class GoalDepositModalComponent extends MyFinance implements OnInit {
  isLoading = false;
  investmentAssets: any[] = [];
  banks: any[] = [];

  form: FormGroup = new FormGroup({
    type: new FormControl('deposit', [Validators.required]),
    value: new FormControl(null, [Validators.required]),
    date: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
    note: new FormControl(''),
    linkInvestment: new FormControl(false),
    investmentAssetId: new FormControl(''),
    brokerId: new FormControl(''),
    createInvestmentTransaction: new FormControl(true),
  });

  constructor(
    private dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public dialogData: {
      goalId: string;
      goalName: string;
      currentAmount: number;
      targetAmount: number;
      color?: string;
    }
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await this.loadDependencies();
  }

  async loadDependencies(): Promise<void> {
    try {
      const [assetsRes, banksRes] = await Promise.allSettled([
        api.get('/investments/investment-assets'),
        api.get('/banks/select?deleted=false'),
      ]);

      if (assetsRes.status === 'fulfilled') {
        const raw = assetsRes.value.data;
        this.investmentAssets = raw?.data ?? raw ?? [];
      }

      if (banksRes.status === 'fulfilled') {
        const raw = banksRes.value.data;
        this.banks = raw?.data ?? raw ?? [];
      }
    } catch (e) {
      // Non-blocking
    } finally {
      this.cdr.markForCheck();
    }
  }

  close(result: boolean = false) {
    this.dialogRef.close(result);
  }

  private parseMoney(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/R\$\s?/g, '').trim();
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  async submit() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.form.value;
      const value = this.parseMoney(raw.value);

      if (value <= 0) {
        this.toastWarning('O valor deve ser maior que zero.');
        return;
      }

      if (raw.type === 'deposit' && raw.linkInvestment && !raw.investmentAssetId) {
        this.toastWarning('Selecione o ativo de investimento a ser vinculado.');
        return;
      }

      const payload: any = {
        goalId: this.dialogData.goalId,
        type: raw.type,
        value,
        date: raw.date ? new Date(raw.date).toISOString() : new Date().toISOString(),
        note: raw.note?.trim() || null,
      };

      if (raw.type === 'deposit' && raw.linkInvestment && raw.investmentAssetId) {
        payload.investmentAssetId = raw.investmentAssetId;
        payload.brokerId = raw.brokerId || null;
        payload.createInvestmentTransaction = !!raw.createInvestmentTransaction;
      }

      await api.post(`/goals/${this.dialogData.goalId}/transactions`, payload);
      this.toastSuccess(raw.type === 'withdraw' ? 'Resgate registrado com sucesso.' : 'Aporte realizado com sucesso!');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
