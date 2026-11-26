import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreditCardsComponent } from './pages/credit-cards.component';

const routes: Routes = [
  {
    path: '',
    component: CreditCardsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreditCardsRoutingModule {}
