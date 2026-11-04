import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LifeCostRoutingModule } from './life-cost-routing.module';
import { LifeCostComponent } from './pages/life-cost.component';

@NgModule({
  imports: [CommonModule, LifeCostRoutingModule, LifeCostComponent],
})
export class LifeCostModule {}
