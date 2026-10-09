import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-operation-modal',
  templateUrl: './operation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule, NgxMaskDirective],
})
export class OperationModalComponent extends MyFinance implements OnInit {
  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  form!: FormGroup;
  operation: any = {};
  categories: any[] = [];
  banks: any[] = [];

  get isEdit() {
    return !!this.dialogData?.id;
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      type: ['income', [Validators.required]],
      categoryId: ['', [Validators.required]],
      bankId: ['', [Validators.required]],
      value: ['', [Validators.required]],
      createdAt: [new Date().toISOString().split("T")[0], [Validators.required]],
      description: ['', [Validators.required]],
    });

    this.form.get('type')?.valueChanges.subscribe(async () => {
      this.form.patchValue({ categoryId: '' });
      await this.getCategories();
    });

    await this.getCategories();
    await this.getBanks();
    if (this.dialogData?.id) {
      await this.getById(this.dialogData.id);
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/operations/${id}`);
      this.operation = data.data;
      this.form.patchValue({ ...this.operation, createdAt: this.operation.createdAt.split("T")[0] });
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async getCategories() {
    try {
      const { data } = await api.get(`/categories/select?deleted=false&type=${this.form.value.type}`);
      this.categories = data.data;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async getBanks() {
    try {
      const { data } = await api.get(`/banks/select?deleted=false`);
      this.banks = data.data;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async create() {
    try {
      const body = { ...this.form.value };
      if (!body.value) body.value = 0;
      await api.post('/operations', body);
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  async update() {
    try {
      const body = { ...this.form.value };
      if (!body.value) body.value = 0;
      await api.put('/operations', { ...body, id: this.dialogData.id });
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    }
  }

  close() {
    this.dialog.close(false);
  }
}
