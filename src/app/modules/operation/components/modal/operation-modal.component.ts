import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';

@Component({
  selector: 'app-operation-modal',
  templateUrl: './operation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule],
})
export class OperationModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  operation: any = {};

  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  get isEdit() {
    return !!this.dialogData?.id;
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      type: ['income', [Validators.required]],
    });

    if (this.dialogData?.id) {
      this.getById(this.dialogData.id);
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/operations/${id}`);
      this.operation = data.data;
      this.form.patchValue({
        name: data.data.name,
        type: data.data.type?.toLowerCase(),
      });
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
      await api.post('/operations', body);
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
