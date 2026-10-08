import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-category-modal',
  templateUrl: './category-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule],
})
export class CategoryModalComponent implements OnInit {
  form!: FormGroup;
  category: any = {};

  constructor(
    private readonly formBuilder: FormBuilder,
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
  ) {}

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
      const { data } = await api.get(`/categories/${id}`);
      this.category = data.data;
      console.log(data.data.type)
      this.form.patchValue({
        name: data.data.name,
        type: data.data.type,
      });
    } catch (error) {}
  }

  async create() {
    try {
      if (this.form.invalid) {
        return;
      }
      const body = this.form.value;
      await api.post('/categories', body);
      this.dialog.close(true);
    } catch (error) {}
  }

  async update() {
    try {
      if (this.form.invalid) {
        return;
      }
      const body = this.form.value;
      await api.put('/categories', { ...body, id: this.dialogData.id });
      this.dialog.close(true);
    } catch (error) {}
  }

  close() {
    this.dialog.close(false);
  }
}
