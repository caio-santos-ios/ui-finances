import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AbstractControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { JsonEditorComponent } from 'src/app/shared/components/json-editor/json-editor.component';

function jsonArray(control: AbstractControl): ValidationErrors | null {
  try {
    return Array.isArray(JSON.parse(control.value)) ? null : { json: true };
  } catch {
    return { json: true };
  }
}

function jsonObjectOrEmpty(control: AbstractControl): ValidationErrors | null {
  if (!control.value || !control.value.trim()) return null;
  try {
    const parsed = JSON.parse(control.value);
    return typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? null : { jsonObject: true };
  } catch {
    return { jsonObject: true };
  }
}

@Component({
  selector: 'app-setting-dashboard-modal',
  templateUrl: './setting-dashboard-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule, JsonEditorComponent],
})
export class SettingDashboardModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  dashboard: any = {};
  isLoading = false;

  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
  ) {
    super();
  }

  get isEdit() {
    return !!this.dialogData?.id;
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      sequence: ['', [Validators.required]],
      type: ['kpi', [Validators.required]],
      collection: ['operations', [Validators.required]],
      cardClass: ['col-span-12 lg:col-span-6'],
      formats: ['', [jsonObjectOrEmpty]],
      query: ['[]', [Validators.required, jsonArray]],
    });

    if (this.dialogData?.id) {
      this.getById(this.dialogData.id);
    } else {
      this.loadNextSequence();
    }
  }

  async loadNextSequence() {
    try {
      const { data } = await api.get('/dashboard?deleted=false&pageNumber=1&pageSize=500');
      const items: any[] = data?.data?.data ?? [];
      const maxSeq = items.reduce((max, item) => {
        const num = Number(item?.sequence);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      if (!this.form.get('sequence')?.value) {
        this.form.patchValue({ sequence: maxSeq + 1 });
      }
    } catch {
      if (!this.form.get('sequence')?.value) {
        this.form.patchValue({ sequence: 1 });
      }
    } finally {
      this.cdr.markForCheck();
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/dashboard/${id}`);
      this.dashboard = data.data;
      this.form.patchValue({
        ...this.dashboard,
        formats: this.dashboard.formats ? (typeof this.dashboard.formats === 'string' ? this.dashboard.formats : JSON.stringify(this.dashboard.formats, null, 2)) : '',
        query: typeof data.data.query === 'string' ? data.data.query : JSON.stringify(data.data.query, null, 2),
      });
      this.formatQuery();
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  formatQuery() {
    try {
      const query = this.form.value.query;
      this.form.patchValue({ query: JSON.stringify(JSON.parse(query), null, 2) });
    } catch {
    }
  }

  private parseFormats(value: any) {
    if (!value || typeof value !== 'string' || !value.trim()) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async create() {
    if (this.isLoading) return;
    try {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.toastWarning('Preencha todos os campos obrigatórios corretamente.');
        return;
      }
      this.isLoading = true;
      const raw = this.form.value;
      const body = {
        ...raw,
        sequence: Number(raw.sequence) || 1,
        cardClass: String(raw.cardClass ?? '').trim(),
        formats: this.parseFormats(raw.formats),
      };
      await api.post('/dashboard', body);
      this.toastSuccess('Configuração de dashboard criada com sucesso.');
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
    try {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.toastWarning('Preencha todos os campos obrigatórios corretamente.');
        return;
      }
      this.isLoading = true;
      const raw = this.form.value;
      const body = {
        ...raw,
        sequence: Number(raw.sequence) || 1,
        cardClass: String(raw.cardClass ?? '').trim(),
        formats: this.parseFormats(raw.formats),
        id: this.dialogData.id,
      };
      await api.put('/dashboard', body);
      this.toastSuccess('Configuração de dashboard atualizada com sucesso.');
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