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
}
