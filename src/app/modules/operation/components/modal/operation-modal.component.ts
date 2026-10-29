import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
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
  ) {
    super();
  }

  form!: FormGroup;
  operation: any = {};
  categories: any[] = [];
  banks: any[] = [];
  isLoading = false;

  get isEdit() {
    return !!this.dialogData?.id;
  }

  async ngOnInit(): Promise<void> {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    this.form = this.formBuilder.group({
      type: ['income', [Validators.required]],
      categoryId: [''],
      bankId: ['', [Validators.required]],
      destinationBankId: [''],
      value: ['', [Validators.required]],
      createdAt: [currentDate, [Validators.required]],
      time: [currentTime, [Validators.required]],
      description: ['', [Validators.required]],
      repeat: [false],
      recurrence: [''],
    });

    await this.getBanks();
    if (this.dialogData?.id) {
      await this.getById(this.dialogData.id);
    } else {
      await this.getCategories();
    }

    this.form.get('type')?.valueChanges.subscribe(async (type) => {
      this.form.patchValue({ categoryId: '', destinationBankId: '' }, { emitEvent: false });
      if (type !== 'transfer') {
        await this.getCategories();
      } else {
        this.form.patchValue({ repeat: false, recurrence: '' }, { emitEvent: false });
        this.categories = [];
        this.cdr.markForCheck();
      }
    });

    this.form.get('repeat')?.valueChanges.subscribe((repeat) => {
      if (repeat && !this.form.value.recurrence) {
        this.form.patchValue({ recurrence: 'monthly' }, { emitEvent: false });
      } else if (!repeat) {
        this.form.patchValue({ recurrence: '' }, { emitEvent: false });
      }
      this.cdr.markForCheck();
    });
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/operations/${id}`);
      this.operation = data.data;
      this.form.patchValue({ type: this.operation.type }, { emitEvent: false });
      if (this.operation.type !== 'transfer') {
        await this.getCategories();
      }
      const [datePart, timeFull] = (this.operation.createdAt || '').split('T');
      const timePart = timeFull ? timeFull.slice(0, 5) : '00:00';
      this.form.patchValue(
        {
          ...this.operation,
          categoryId: this.operation.categoryId || '',
          bankId: this.operation.bankId || '',
          destinationBankId: this.operation.destinationBankId || '',
          createdAt: datePart,
          time: timePart,
          repeat: !!this.operation.repeat,
          recurrence: this.operation.recurrence || '',
        },
        { emitEvent: false }
      );
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async getCategories() {
    try {
      if (this.form.value.type === 'transfer') {
        this.categories = [];
        return;
      }
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

  private buildPayload() {
    const body = { ...this.form.value };
    if (!body.value) body.value = 0;
    if (!body.repeat) body.recurrence = '';
    const time = body.time || '00:00';
    body.createdAt = `${body.createdAt}T${time}:00Z`;
    delete body.time;
    return body;
  }

  async create() {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const body = this.buildPayload();
      await api.post('/operations', body);
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async update() {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const body = this.buildPayload();
      await api.put('/operations', { ...body, id: this.dialogData.id });
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  close() {
    this.dialog.close(false);
  }
}
