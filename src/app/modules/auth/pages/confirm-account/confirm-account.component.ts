import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-confirm-account',
  templateUrl: './confirm-account.component.html',
  styleUrls: ['./confirm-account.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, RouterLink, AngularSvgIconModule, ButtonComponent, ReactiveFormsModule],
})
export class ConfirmAccountComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  submitted = false;
  resending = false;

  constructor(private route: ActivatedRoute) {
    super();
  }

  ngOnInit(): void {
    const codeParam = this.route.snapshot.paramMap.get('code') || this.route.snapshot.queryParamMap.get('code') || '';
    const emailParam = this.route.snapshot.queryParamMap.get('email') || '';

    this.form = this.formBuilder.group({
      code: [codeParam, [Validators.required]],
      email: [emailParam, [Validators.email]],
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.toastWarning('Preencha o código de confirmação.');
      return;
    }

    try {
      this.submitted = true;
      const { data } = await api.put('/users/confirm-account', { ...this.form.value });
      this.toastSuccess(data?.message || 'Conta confirmada com sucesso!');
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

  async resendCode() {
    const email = this.form.get('email')?.value;
    if (!email) {
      this.toastWarning('Informe o seu e-mail para reenviar o código.');
      return;
    }

    try {
      this.resending = true;
      const { data } = await api.post('/auth/new-code', { email });
      this.toastSuccess(data?.message || 'Novo código enviado para o seu e-mail.');
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.resending = false;
      this.cdr.markForCheck();
    }
  }
}
