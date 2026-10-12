import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-budget-modal',
  templateUrl: './budget-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective],
})
export class BudgetModalComponent extends MyFinance implements OnInit {

  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
  ) {
    super();
  }

  form!: FormGroup;
  budget: any = {};
  categories: any[] = [];

  get isEdit() {
    return !!this.dialogData?.id;
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      categoryId: ['', [Validators.required]],
      limit: ['', [Validators.required]],
      alertPercentage: ['', [Validators.required]],
      type: ['income', [Validators.required]],
      receiveAlert: [false, [Validators.required]],
    });

    await this.getCategories();
    if (this.dialogData?.id) {
      await this.getById(this.dialogData.id);
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/budgets/${id}`);
      this.budget = data.data;
      this.form.patchValue({ ...this.budget });
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async getCategories() {
    try {
      const { data } = await api.get(`/categories/select?deleted=false&type=expense`);
      this.categories = data.data;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async create() {
    try {
      if (this.form.invalid) {
        return;
      }
      const body = this.form.value;
      await api.post('/budgets', body);
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async update() {
    try {
      if (this.form.invalid) {
        return;
      }
      const body = this.form.value;
      await api.put('/budgets', { ...body, id: this.dialogData.id });
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  close() {
    this.dialog.close(false);
  }
}
