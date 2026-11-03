import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatrimonyRoutingModule } from './patrimony-routing.module';
import { PatrimonyComponent } from './pages/patrimony.component';

@NgModule({
  imports: [CommonModule, PatrimonyRoutingModule, PatrimonyComponent],
})
export class PatrimonyModule {}
