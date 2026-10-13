import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-change-password-modal',
  templateUrl: './change-password-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent],
})
export class ChangePasswordModalComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  submitted: boolean = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private dialog: DialogRef,
    @Inject(DIALOG_DATA)
    public dialogData: { id: string; email: string; name: string; phone?: string; admin?: boolean },
  ) {
    super();
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  close() {
    this.dialog.close(false);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.toastWarning('Preencha todos os campos corretamente.');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.form.value;

    if (newPassword !== confirmPassword) {
      this.toastWarning('A confirmação não coincide com a nova senha.');
      return;
    }

    if (currentPassword === newPassword) {
      this.toastWarning('A nova senha deve ser diferente da senha atual.');
      return;
    }

    try {
      this.submitted = true;

      try {
        await api.post('/auth/login', {
          email: this.dialogData.email,
          password: currentPassword,
        });
      } catch (loginError) {
        this.toastWarning('A senha atual está incorreta.');
        return;
      }

      const payload: any = {
        id: this.dialogData.id,
        name: this.dialogData.name,
        email: this.dialogData.email,
        phone: this.dialogData.phone || '',
        password: newPassword,
        admin: !!this.dialogData.admin,
      };

      const { data } = await api.put('/users', payload);
      this.toastSuccess(data?.message || 'Senha alterada com sucesso!');
      this.dialog.close(true);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.submitted = false;
      this.cdr.markForCheck();
    }
  }
}
