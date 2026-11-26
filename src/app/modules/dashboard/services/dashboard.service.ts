import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { api } from 'src/app/shared/api/api';

export interface ProjectedBalanceLowestPoint {
  day: number;
  date: string;
  balance: number;
  isDeficit: boolean;
}

export interface ProjectedBalanceTimelineItem {
  day: number;
  date: string;
  balance: number;
  events: string[];
}

export interface ProjectedBalancePendingItem {
  description: string;
  value: number;
  type: 'revenue' | 'expense';
  dueDay: number;
  source?: string;
}

export interface ProjectedBalanceDto {
  month: number;
  year: number;
  currentBalance: number;
  pendingRevenues: number;
  pendingExpenses: number;
  projectedEndBalance: number;
  status: 'positive' | 'negative';
  lowestPoint: ProjectedBalanceLowestPoint;
  dailyTimeline: ProjectedBalanceTimelineItem[];
  pendingItems: ProjectedBalancePendingItem[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  getProjectedBalance(month?: number, year?: number): Observable<ProjectedBalanceDto> {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    const qs = params.toString();

    return from(api.get(`/dashboard/projected-balance${qs ? '?' + qs : ''}`)).pipe(
      map((res) => res.data?.data ?? res.data)
    );
  }
}
