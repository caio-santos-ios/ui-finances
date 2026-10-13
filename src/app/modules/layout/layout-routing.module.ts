import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AuthGuard } from 'src/app/core/guards/auth-guard';

const routes: Routes = [
  {
    path: 'dashboard',
    component: LayoutComponent,
    loadChildren: () => import('../dashboard/dashboard.module').then((m) => m.DashboardModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'categories',
    component: LayoutComponent,
    loadChildren: () => import('../category/category.module').then((m) => m.CategoryModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'operations',
    component: LayoutComponent,
    loadChildren: () => import('../operation/operation.module').then((m) => m.OperationModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'budgets',
    component: LayoutComponent,
    loadChildren: () => import('../budget/budget.module').then((m) => m.BudgetModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'banks',
    component: LayoutComponent,
    loadChildren: () => import('../bank/bank.module').then((m) => m.BankModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'setting-dashboard',
    component: LayoutComponent,
    loadChildren: () => import('../setting-dashboard/setting-dashboard.module').then((m) => m.SettingDashboardModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'profile',
    component: LayoutComponent,
    loadChildren: () => import('../profile/profile.module').then((m) => m.ProfileModule),
    canActivate: [AuthGuard],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'error/404' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule { }
