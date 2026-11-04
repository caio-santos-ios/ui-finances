import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { NgxMaskDirective } from 'ngx-mask';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-goal-modal',
  templateUrl: './goal-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxMaskDirective, ButtonComponent],
})
export class GoalModalComponent extends MyFinance implements OnInit {
  isLoading = false;
  isEdit = false;

  form: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    targetAmount: new FormControl(null, [Validators.required]),
    initialAmount: new FormControl(null),
    targetDate: new FormControl(''),
    icon: new FormControl('bullseye'),
    color: new FormControl('#ec4899'),
  });

  icons = [
    { label: 'Alvo', value: 'bullseye' },
    { label: 'Carro', value: 'car' },
    { label: 'Casa', value: 'house' },
    { label: 'Viagem', value: 'plane' },
    { label: 'Educação', value: 'graduation-cap' },
    { label: 'Férias', value: 'umbrella-beach' },
    { label: 'Tecnologia', value: 'laptop' },
    { label: 'Cofrinho', value: 'piggy-bank' },
    { label: 'Coração', value: 'heart' },
    { label: 'Troféu', value: 'trophy' },
  ];

  colors = [
    '#ec4899',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
  ];

  constructor(
    private dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public dialogData: { id?: string }
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    if (this.dialogData?.id) {
      this.isEdit = true;
      await this.getById(this.dialogData.id);
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/goals/${id}`);
      const goal = data.data;
      const formattedDate = goal.targetDate ? goal.targetDate.split('T')[0] : '';
      this.form.patchValue({
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: formattedDate,
        icon: goal.icon || 'bullseye',
        color: goal.color || '#ec4899',
      });
    } catch (error) {
      this.normalizeErr(error);
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

  async create() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isLoading = true;
      const raw = this.form.value;
      const targetAmount = this.parseMoney(raw.targetAmount);
      const initialAmount = this.parseMoney(raw.initialAmount);

      if (targetAmount <= 0) {
        this.toastWarning('O valor desejado deve ser maior que zero.');
        return;
      }

      const payload = {
        name: raw.name.trim(),
        targetAmount,
        initialAmount,
        targetDate: raw.targetDate ? new Date(raw.targetDate).toISOString() : null,
        icon: raw.icon,
        color: raw.color,
      };

      await api.post('/goals', payload);
      this.toastSuccess('Meta cadastrada com sucesso.');
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
      const targetAmount = this.parseMoney(raw.targetAmount);

      if (targetAmount <= 0) {
        this.toastWarning('O valor desejado deve ser maior que zero.');
        return;
      }

      const payload = {
        id: this.dialogData.id,
        name: raw.name.trim(),
        targetAmount,
        targetDate: raw.targetDate ? new Date(raw.targetDate).toISOString() : null,
        icon: raw.icon,
        color: raw.color,
      };

      await api.put('/goals', payload);
      this.toastSuccess('Meta atualizada com sucesso.');
      this.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
