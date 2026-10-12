import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterLink, AngularSvgIconModule, ButtonComponent, ReactiveFormsModule],
})
export class SignUpComponent extends MyFinance implements OnInit {
  constructor() {
    super();
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      rememberMe: [false],
    });
  }

  form!: FormGroup;
  submitted = false;

  async onSubmit() {
    try {
      this.submitted = true;
      const body = this.form.value;
      if (body.password !== body.confirmPassword) {
        this.toastWarning('As senhas não conferem.');
        return;
      }
      const { data } = await api.post('/auth/register', { ...body });
      this.toastSuccess(data?.message);
      setTimeout(() => {
        this.router.navigate(['/auth/sign-in']);
      }, 1500);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
      this.submitted = false;
    }
  }
}
