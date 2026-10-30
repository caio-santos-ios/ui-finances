import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
})
export class PrivacyPolicyComponent {
  isLoggedIn = false;

  constructor(private router: Router) {
    this.isLoggedIn = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate([this.isLoggedIn ? '/dashboard' : '/auth/sign-in']);
    }
  }
}
