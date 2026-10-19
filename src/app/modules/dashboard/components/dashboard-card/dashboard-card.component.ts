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
  stackedSeries: { name: string; data: number[] }[] = [];
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

    if (this.dashboard?.type === 'stacked-bar') {
      this.buildStackedSeries(first, labelKey, valueKey);
    }

    this.columns = Object.keys(first);
    this.tableRows = this.rows.map(r =>
      Object.fromEntries(this.columns.map(c => [c, this.fmt(c, r[c])])));

    const formats = this.dashboard?.formats ?? {};
    const formatKey = (valueKey in formats)
      ? valueKey
      : (Object.keys(formats).find(k => k !== labelKey) ?? valueKey);
    const money = (v: number) => this.fmt(formatKey, v);
    this.yaxis = { labels: { formatter: money } };
    this.dataLabels = { formatter: money };
    this.tooltip = { y: { formatter: money } };

    this.resolveKpiStyle();
  }

  private buildStackedSeries(first: any, labelKey: string, valueKey: string): void {
    if (!this.rows.length) {
      this.stackedSeries = [];
      return;
    }

    const arrayKey = Object.keys(first).find(k => Array.isArray(first[k]));
    if (arrayKey) {
      const seriesNames = Array.from(
        new Set(
          this.rows.flatMap(r =>
            (r[arrayKey] ?? []).map((item: any) => String(item.name ?? item.series ?? item.label ?? item._id ?? ''))
          )
        )
      ).filter(Boolean);

      this.stackedSeries = seriesNames.map(name => ({
        name,
        data: this.rows.map(r => {
          const found = (r[arrayKey] ?? []).find(
            (item: any) => String(item.name ?? item.series ?? item.label ?? item._id ?? '') === name
          );
          return Number(found?.[valueKey] ?? found?.total ?? found?.value ?? 0);
        }),
      }));
      return;
    }

    const groupKey = ['series', 'category', 'group', 'type', 'bank', 'stack'].find(
      k => k in first && k !== labelKey && k !== valueKey && typeof first[k] === 'string'
    );

    if (groupKey) {
      const rawLabels = Array.from(new Set(this.rows.map(r => r[labelKey])));
      this.labels = rawLabels.map(l => this.fmt(labelKey, l));
      const seriesNames = Array.from(new Set(this.rows.map(r => String(r[groupKey] ?? ''))));

      this.stackedSeries = seriesNames.map(name => ({
        name,
        data: rawLabels.map(l => {
          const found = this.rows.find(r => r[labelKey] === l && String(r[groupKey] ?? '') === name);
          return Number(found?.[valueKey] ?? 0);
        }),
      }));
      return;
    }

    const seriesKeys = Object.keys(first).filter(k => k !== labelKey);
    this.stackedSeries = seriesKeys.map(key => ({
      name: key,
      data: this.rows.map(r => Number(r[key] ?? 0)),
    }));
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