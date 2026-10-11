import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrls: ['./new-password.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterLink, AngularSvgIconModule, ButtonComponent, ReactiveFormsModule],
})
export class NewPasswordComponent extends MyFinance implements OnInit {
  constructor(private route: ActivatedRoute) {
    super();
  }

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    this.form = this.formBuilder.group({
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
      code: [code, [Validators.required]]
    });
  }

  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;
  codeAccess: string = "";

  async onSubmit() {
    try {
      this.submitted = true;
      const { data } = await api.post('/auth/reset-password', { ...this.form.value });
      this.toastSuccess(data?.message);
      setTimeout(() => {
        this.router.navigate(['/auth/sign-in']);
      }, 1500);
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.submitted = false;
    }
  }
}
