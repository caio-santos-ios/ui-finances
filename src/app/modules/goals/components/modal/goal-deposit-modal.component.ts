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

  form: FormGroup = new FormGroup({
    type: new FormControl('deposit', [Validators.required]),
    value: new FormControl(null, [Validators.required]),
    date: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
    note: new FormControl(''),
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

  ngOnInit(): void {}

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

      const payload = {
        goalId: this.dialogData.goalId,
        type: raw.type,
        value,
        date: raw.date ? new Date(raw.date).toISOString() : new Date().toISOString(),
        note: raw.note?.trim() || null,
      };

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
