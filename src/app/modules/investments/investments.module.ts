import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvestmentsRoutingModule } from './investments-routing.module';
import { InvestmentsComponent } from './pages/investments.component';

@NgModule({
  imports: [CommonModule, InvestmentsRoutingModule, InvestmentsComponent],
})
export class InvestmentsModule {}
