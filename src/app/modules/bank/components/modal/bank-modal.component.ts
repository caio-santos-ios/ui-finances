import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { api } from 'src/app/shared/api/api';
import { MyFinance } from 'src/app/core/utils/my-finance.util';

@Component({
  selector: 'app-bank-modal',
  templateUrl: './bank-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, FormsModule, ReactiveFormsModule],
})
export class BankModalComponent extends MyFinance implements OnInit {

  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA) public dialogData: { id: string },
  ) {
    super();
  }

  form!: FormGroup;
  bank: any = {};
  typeBanks: any[] = [];
  isLoading = false;

  get isEdit() {
    return !!this.dialogData?.id;
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      code: ['', [Validators.required]],
    });

    await this.getTypeBanks();
    if (this.dialogData?.id) {
      await this.getById(this.dialogData.id);
    }
  }

  async getById(id: string) {
    try {
      const { data } = await api.get(`/banks/${id}`);
      this.bank = data.data;
      this.form.patchValue({ ...this.bank });
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async getTypeBanks() {
    try {
      const { data } = await api.get(`/generic-tables/select?deleted=false&table=types-banks`);
      this.typeBanks = data.data;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }

  async create() {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const body = this.form.value;
      if (body.code) {
        const typeBank = this.typeBanks.find((x: any) => x.code == body.code);
        if (typeBank) {
          body.name = typeBank.name;
        }
      }
      await api.post('/banks', body);
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
      const body = this.form.value;
      if (body.code) {
        const typeBank = this.typeBanks.find((x: any) => x.code == body.code);
        if (typeBank) {
          body.name = typeBank.name;
        }
      }
      await api.put('/banks', { ...body, id: this.dialogData.id });
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
