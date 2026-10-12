import axios from 'axios';
import { environment } from 'src/environments/environment';

export const api = axios.create({
  baseURL: environment.apiUrl !== undefined ? environment.apiUrl : 'http://localhost:5310',
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      const path = window.location.pathname;
      console.log(path)
      if (path !== '/login' && !path.startsWith('/reset-password') && !path.startsWith('/confirmation')) {
        window.location.href = '/auth/sign-in';
      }
    }
    return Promise.reject(error);
  }
);