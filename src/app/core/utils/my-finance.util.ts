import { ApplicationRef, inject, Injectable } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';

@Injectable({
  providedIn: 'root',
})
export class MyFinance {
  private routerService = inject(Router);
  private formBuilderService = inject(FormBuilder);
  private appRef = inject(ApplicationRef);

  constructor() { }

  get router() {
    return this.routerService;
  }
  
  get formBuilder() {
    return this.formBuilderService;
  }

  normalizeErr(err: any) {
    const status = err?.response?.status;
    if (status == 401) {
      this.routerService.navigateByUrl('/auth/sign-in');
      return;
    }

    if (status >= 400 && status < 500) {
      const data = err?.response?.data;
      let message = data?.message || data?.Message;
      if (!message && data?.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0];
        const errorVal = data.errors[firstKey];
        message = Array.isArray(errorVal) ? errorVal[0] : errorVal;
      }
      if (!message && typeof data === 'string' && data.trim()) {
        message = data;
      }
      if (!message) {
        message = data?.title || 'Ocorreu um erro na requisição.';
      }
      toast.warning(message);
      this.appRef.tick();
    }

    if (status >= 500 && status < 600) {
      const data = err?.response?.data;
      const message =
        data?.message ||
        data?.Message ||
        (typeof data === 'string' && data.trim() ? data : null) ||
        'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';
      toast.error(message);
      this.appRef.tick();
    }

    if (!status) {
      toast.error(err?.message || 'Falha de comunicação com o servidor.');
      this.appRef.tick();
    }
  }
}
