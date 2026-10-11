import { Component, Input, OnChanges } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-dashboard-card',
  imports: [NgApexchartsModule],
  templateUrl: './dashboard-card.component.html',
  host: {
    '[class]': 'dashboard.cardClass || ""',
  },
})
export class DashboardCardComponent implements OnChanges {
  @Input({ required: true }) dashboard: any;

  rows: any[] = [];
  labels: string[] = [];
  values: number[] = [];
  columns: string[] = [];
  tableRows: Record<string, string>[] = [];
  kpi = '';
  kpiIcon = 'fa-solid fa-chart-line';
  kpiIconBg = 'bg-primary/10 text-primary';

  yaxis: any = {};
  dataLabels: any = {};
  tooltip: any = {};

  private brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  private num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

  ngOnChanges(): void {
    this.rows = this.dashboard?.data ?? [];
    const first = this.rows[0] ?? {};
    const labelKey = ['_id', 'label', 'name'].find(k => k in first) ?? '_id';
    const valueKey = ['total', 'value'].find(k => k in first) ?? 'total';

    this.labels = this.rows.map(r => this.fmt(labelKey, r[labelKey]));
    this.values = this.rows.map(r => Number(r[valueKey] ?? 0));
    this.kpi = this.rows.length ? this.fmt(valueKey, first[valueKey]) : '';

    this.columns = Object.keys(first);
    this.tableRows = this.rows.map(r =>
      Object.fromEntries(this.columns.map(c => [c, this.fmt(c, r[c])])));

    const money = (v: number) => this.fmt(valueKey, v);
    this.yaxis = { labels: { formatter: money } };
    this.dataLabels = { formatter: money };
    this.tooltip = { y: { formatter: money } };

    this.resolveKpiStyle();
  }

  private resolveKpiStyle(): void {
    const name = (this.dashboard?.name || '').toLowerCase();
    if (name.includes('receita') || name.includes('entrada') || name.includes('lucro') || name.includes('ganho')) {
      this.kpiIcon = 'fa-solid fa-arrow-trend-up';
      this.kpiIconBg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    } else if (name.includes('despesa') || name.includes('gasto') || name.includes('saída') || name.includes('saida') || name.includes('custo')) {
      this.kpiIcon = 'fa-solid fa-arrow-trend-down';
      this.kpiIconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    } else if (name.includes('saldo') || name.includes('banco') || name.includes('carteira') || name.includes('total')) {
      this.kpiIcon = 'fa-solid fa-wallet';
      this.kpiIconBg = 'bg-primary/10 text-primary border border-primary/20';
    } else if (name.includes('orçamento') || name.includes('orcamento') || name.includes('meta')) {
      this.kpiIcon = 'fa-solid fa-bullseye';
      this.kpiIconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    } else {
      this.kpiIcon = 'fa-solid fa-chart-line';
      this.kpiIconBg = 'bg-primary/10 text-primary border border-primary/20';
    }
  }

  private fmt(key: string, value: any): string {
    if (value === null || value === undefined) return '';
    switch (this.dashboard?.formats?.[key]) {
      case 'currency': return this.brl.format(Number(value));
      case 'number': return this.num.format(Number(value));
      case 'percent': return this.num.format(Number(value)) + '%';
      case 'month': {
        const [y, m] = String(value).split('-');
        return `${m}/${y}`;
      }
      case 'date': return this.date(String(value), false);
      case 'datetime': return this.date(String(value), true);
      default: return String(value);
    }
  }

  private date(v: string, withTime: boolean): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return withTime ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
  }
}