import { ApplicationRef, ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { jwtDecode } from "jwt-decode";

@Injectable({
  providedIn: 'root',
})
export class MyFinance {
  private routerService = inject(Router);
  private formBuilderService = inject(FormBuilder);
  private cdrService = inject(ChangeDetectorRef);
  private appRef = inject(ApplicationRef);

  constructor() { }

  get router() {
    return this.routerService;
  }

  get formBuilder() {
    return this.formBuilderService;
  }

  get cdr() {
    return this.cdrService;
  }

  private showToast(type: 'success' | 'error' | 'warning', message: string, duration: number) {
    const id = toast[type](message, { duration: Number.POSITIVE_INFINITY });
    this.appRef.tick();
    setTimeout(() => {
      this.appRef.tick();
    }, 50);
    setTimeout(() => {
      toast.dismiss(id);
      this.appRef.tick();
    }, duration);
  }

  toastSuccess(message: string, duration: number = 4000) {
    this.showToast('success', message, duration);
  }

  toastError(message: string, duration: number = 5000) {
    this.showToast('error', message, duration);
  }

  toastWarning(message: string, duration: number = 5000) {
    this.showToast('warning', message, duration);
  }

  normalizeErr(err: any) {
    const status = err?.response?.status;
    if (status == 401) {
      this.routerService.navigateByUrl('/auth/sign-in');
      return;
    }

    if (status >= 400 && status < 500) {
      const data = err?.response?.data;
      let message = data?.message;
      this.toastWarning(message, 6000);
      return;
    }

    if (status >= 500 && status < 600) {
      const message = 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';
      this.toastError(message, 5000);
      return;
    }

    if (!status) {
      this.toastError(err?.message || 'Falha de comunicação com o servidor.', 5000);
    }
  }

  getUser() {
    const token = localStorage.getItem("token");

    if (token) {
      const decodedHeader: any = jwtDecode(token);

      return {
        id: decodedHeader.sub,
        name: decodedHeader.name,
        photo: decodedHeader.photo,
        email: decodedHeader.email
      }
    } else {
      return {
        id: "",
        name: "",
        photo: "",
        email: ""
      }
    }
  }

  getStoredCardsVisibility(key: string, defaultValue = true): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          return saved === 'true';
        }
      }
    } catch {
      // fallback
    }
    return defaultValue;
  }

  setStoredCardsVisibility(key: string, value: boolean): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(value));
      }
    } catch {
      // fallback
    }
  }

  sortData<T>(
    list: T[],
    column: string,
    currentColumn: string,
    currentDirection: 'asc' | 'desc' | ''
  ): { list: T[]; column: string; direction: 'asc' | 'desc' } {
    const direction: 'asc' | 'desc' =
      currentColumn === column && currentDirection === 'asc' ? 'desc' : 'asc';

    const sorted = [...(list || [])].sort((a: any, b: any) => {
      let valA = this.getNestedValue(a, column);
      let valB = this.getNestedValue(b, column);

      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return direction === 'asc' ? numA - numB : numB - numA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      const numA =
        typeof valA === 'string' && valA.trim() !== '' && !isNaN(Number(valA))
          ? Number(valA)
          : NaN;
      const numB =
        typeof valB === 'string' && valB.trim() !== '' && !isNaN(Number(valB))
          ? Number(valB)
          : NaN;
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }

      const dateA =
        typeof valA === 'string' &&
        valA.length >= 10 &&
        (valA.includes('-') || valA.includes('/'))
          ? Date.parse(valA)
          : NaN;
      const dateB =
        typeof valB === 'string' &&
        valB.length >= 10 &&
        (valB.includes('-') || valB.includes('/'))
          ? Date.parse(valB)
          : NaN;
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      const strA = String(valA).trim();
      const strB = String(valB).trim();
      return direction === 'asc'
        ? strA.localeCompare(strB, 'pt-BR', { sensitivity: 'base', numeric: true })
        : strB.localeCompare(strA, 'pt-BR', { sensitivity: 'base', numeric: true });
    });

    return { list: sorted, column, direction };
  }

  getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return null;
    const val = path
      .split('.')
      .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
    if (Array.isArray(val)) {
      return val.join(', ');
    }
    return val;
  }
}
