import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingDashboardComponent } from './pages/setting-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: SettingDashboardComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingDashboardRoutingModule {}
