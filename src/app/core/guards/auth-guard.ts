import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { api } from 'src/app/shared/api/api';

export const AuthGuard: CanActivateFn = async () => {
    const router = inject(Router);

    const token = localStorage.getItem("token");
    const rememberMe = localStorage.getItem("rememberMe");

    if (token) {
        return true;
    }

    if (rememberMe) {
        const isRememberMe = JSON.parse(rememberMe);
        if (isRememberMe) {
            const refreshToken = localStorage.getItem("refreshToken");
            const { data } = await api.post("/auth/refresh-token", { refreshToken });
            localStorage.setItem("token", data.data.token);
            localStorage.setItem("refreshToken", data.data.refreshToken);
            localStorage.setItem("rememberMe", rememberMe);
            return true;
        }
    }

    router.navigate(['/auth/sign-in']);
    return false;
};