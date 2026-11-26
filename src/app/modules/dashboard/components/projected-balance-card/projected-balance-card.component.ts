import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MoneyPipe } from 'src/app/shared/pipes/money.pipe';
import {
  DashboardService,
  ProjectedBalanceDto,
} from '../../services/dashboard.service';

@Component({
  selector: 'app-projected-balance-card',
  standalone: true,
  templateUrl: './projected-balance-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgApexchartsModule, MoneyPipe],
})
export class ProjectedBalanceCardComponent implements OnInit {
  loading = true;
  error = '';
  data: ProjectedBalanceDto | null = null;

  selectedMonth: number;
  selectedYear: number;

  months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  years: number[] = [];

  chartSeries: any[] = [];
  chartOptions: any = {};

  private brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();
    this.years = [this.selectedYear - 1, this.selectedYear, this.selectedYear + 1];
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.dashboardService.getProjectedBalance(this.selectedMonth, this.selectedYear).subscribe({
      next: (res) => {
        this.data = res;
        this.buildChart(res);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.response?.data?.message || 'Não foi possível carregar o saldo projetado.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFilterChange(): void {
    this.loadData();
  }

  getSourceLabel(source?: string): string {
    switch (source) {
      case 'recurring': return 'Recorrente';
      case 'debt': return 'Dívida';
      case 'operation': return 'Agendado';
      default: return 'Previsto';
    }
  }

  private buildChart(dto: ProjectedBalanceDto): void {
    const timeline = dto.dailyTimeline || [];
    const categories = timeline.map((t) => `Dia ${String(t.day).padStart(2, '0')}`);
    const values = timeline.map((t) => Number(t.balance || 0));
    const isPositive = dto.projectedEndBalance >= 0;
    const strokeColor = dto.lowestPoint?.isDeficit ? '#f59e0b' : (isPositive ? '#10b981' : '#f43f5e');

    this.chartSeries = [
      {
        name: 'Saldo Projetado',
        data: values,
      },
    ];

    this.chartOptions = {
      chart: {
        type: 'area',
        height: 240,
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        fontFamily: 'inherit',
      },
      colors: [strokeColor],
      stroke: {
        curve: 'smooth',
        width: 2.5,
        dashArray: 5,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.02,
          stops: [0, 95, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 3,
        hover: { size: 6 },
      },
      grid: {
        borderColor: 'rgba(148, 163, 184, 0.12)',
        strokeDashArray: 4,
      },
      xaxis: {
        categories,
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: (val: number) => this.brl.format(val),
        },
      },
      annotations: dto.lowestPoint?.isDeficit
        ? {
            yaxis: [
              {
                y: 0,
                borderColor: '#f43f5e',
                strokeDashArray: 4,
                label: {
                  text: 'R$ 0,00',
                  style: { color: '#fff', background: '#f43f5e', fontSize: '10px' },
                },
              },
            ],
          }
        : {},
      tooltip: {
        theme: 'dark',
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const point = timeline[dataPointIndex];
          if (!point) return '';
          const balClass = point.balance >= 0 ? 'color:#10b981' : 'color:#f43f5e';
          const eventsHtml = point.events && point.events.length > 0
            ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#cbd5e1;">
                ${point.events.map((ev) => `<div style="margin-top:2px;">• ${ev}</div>`).join('')}
               </div>`
            : `<div style="margin-top:4px;font-size:11px;color:#94a3b8;">Sem vencimentos neste dia</div>`;

          return `<div style="padding:10px 12px;min-width:180px;">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Dia ${String(point.day).padStart(2, '0')} (${point.date.split('-').reverse().join('/')})</div>
            <div style="font-size:14px;font-weight:700;${balClass};">${this.brl.format(point.balance)}</div>
            ${eventsHtml}
          </div>`;
        },
      },
    };
  }
}
