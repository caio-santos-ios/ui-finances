import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Nft } from '../../models/nft';
import { api } from 'src/app/shared/api/api';
import { FormsModule } from '@angular/forms';
import { DashboardCardComponent } from '../../components/dashboard-card/dashboard-card.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';

@Component({
  selector: 'app-nft',
  templateUrl: './nft.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    DashboardCardComponent
  ],
})
export class NftComponent extends MyFinance implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {
    super();
  }

  dashboards: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.getAll()
  }

  async getAll() {
    try {
      const { data } = await api.get("/dashboard/dash");
      const result = data.data;
      this.dashboards = result;
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.cdr.markForCheck();
    }
  }
}
