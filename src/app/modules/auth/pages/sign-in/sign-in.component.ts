import { NgClass } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, AngularSvgIconModule, ButtonComponent, NgClass],
})
export class SignInComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
  ) { }

  onClick() {
    console.log('Button clicked');
  }

  ngOnInit(): void {
    this.form = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  async onSubmit() {
    try {
      this.submitted = true;
      const { email, password, rememberMe } = this.form.value;

      if (this.form.invalid) {
        return;
      }

      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("rememberMe", rememberMe);
      setTimeout(() => {
        this._router.navigate(['/']);
      }, 200);
    } catch (error) {

    }
  }
}
