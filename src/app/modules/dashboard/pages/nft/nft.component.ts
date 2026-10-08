import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Nft } from '../../models/nft';
import { api } from 'src/app/shared/api/api';
import { FormsModule } from '@angular/forms';
import { DashboardCardComponent } from '../../components/dashboard-card/dashboard-card.component';

@Component({
  selector: 'app-nft',
  templateUrl: './nft.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    DashboardCardComponent
],
})
export class NftComponent implements OnInit {
  constructor() {}

  dashboards: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.getAll()
  }

  async getAll() {
    try {
      const { data } = await api.get("/dashboard");
      const result = data.data;
      this.dashboards = result;
    } catch (error) {
      
    }
  }
}
