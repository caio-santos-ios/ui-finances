import { ApplicationRef, ChangeDetectorRef, inject, Injectable } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';

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

  toastSuccess(message: string) {
    toast.success(message);
    this.appRef.tick();
  }

  toastError(message: string) {
    toast.error(message);
    this.appRef.tick();
  }

  toastWarning(message: string) {
    toast.warning(message);
    this.appRef.tick();
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
      toast.warning(message, { duration: 6000 });
      this.appRef.tick();
    }

    if (status >= 500 && status < 600) {
      const message = 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';
      toast.error(message);
      this.appRef.tick();
    }

    if (!status) {
      toast.error(err?.message || 'Falha de comunicação com o servidor.');
      this.appRef.tick();
    }
  }
}
