import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';

@Component({
  selector: 'app-confirm-account',
  templateUrl: './confirm-account.component.html',
  styleUrls: ['./confirm-account.component.css'],
  imports: [CommonModule, RouterLink, AngularSvgIconModule],
})
export class ConfirmAccountComponent extends MyFinance implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  message = '';

  constructor(private route: ActivatedRoute) {
    super();
  }

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') || this.route.snapshot.queryParamMap.get('code') || '';
    const email = this.route.snapshot.queryParamMap.get('email') || '';

    if (!code) {
      this.status = 'error';
      this.message = 'Código de confirmação não encontrado na URL.';
      return;
    }

    this.confirmAccount(code, email);
  }

  private async confirmAccount(code: string, email: string): Promise<void> {
    try {
      const payload: { code: string; email?: string } = { code };
      if (email) payload.email = email;

      const { data } = await api.put('/users/confirm-account', payload);
      this.status = 'success';
      this.message = data?.message || 'Conta confirmada com sucesso!';
      this.cdr.detectChanges();

      setTimeout(() => {
        this.router.navigate(['/auth/sign-in']);
      }, 2500);
    } catch (error: any) {
      this.status = 'error';
      this.message = error?.response?.data?.message || error?.message || 'Código inválido ou expirado.';
      this.cdr.detectChanges();
    }
  }
}
