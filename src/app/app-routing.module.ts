import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./modules/layout/layout.module').then((m) => m.LayoutModule),
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'confirmation/:code',
    redirectTo: 'auth/confirmation/:code',
    pathMatch: 'full',
  },
  {
    path: 'confirmation',
    redirectTo: 'auth/confirmation',
    pathMatch: 'full',
  },
  {
    path: 'politica-de-privacidade',
    loadComponent: () =>
      import('./modules/auth/pages/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    path: 'privacy-policy',
    redirectTo: 'politica-de-privacidade',
    pathMatch: 'full',
  },
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.module').then((m) => m.ErrorModule),
  },
  { path: '**', redirectTo: 'errors/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
