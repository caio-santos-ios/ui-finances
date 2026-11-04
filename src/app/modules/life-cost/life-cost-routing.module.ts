import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LifeCostComponent } from './pages/life-cost.component';

const routes: Routes = [
  {
    path: '',
    component: LifeCostComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LifeCostRoutingModule {}
