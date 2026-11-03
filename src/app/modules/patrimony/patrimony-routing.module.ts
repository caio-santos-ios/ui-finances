import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatrimonyComponent } from './pages/patrimony.component';

const routes: Routes = [
  {
    path: '',
    component: PatrimonyComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatrimonyRoutingModule {}
