import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, ButtonComponent],
})
export class ForgotPasswordComponent extends MyFinance implements OnInit {
  ngOnInit(): void {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean; 

  async onSubmit() {
    try {
      this.submitted = true;
      const { email } = this.form.value;
      const { data } = await api.post('/auth/forgot-password', { email });
      this.toastSuccess(data?.message);
      setTimeout(() => {
        this.router.navigate(['/auth/sign-in']);
      }, 1500);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.submitted = false;
      this.cdr.markForCheck();
    }
  }
}
