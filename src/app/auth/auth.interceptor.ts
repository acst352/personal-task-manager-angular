import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_PATHS = ['/api/auth/sessions', '/api/auth/users', '/api/auth/email/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.insforge.baseUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const userToken = authService.getAccessToken();
  const token = userToken ?? environment.insforge.anonKey;

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  ).pipe(
    catchError((err) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        userToken &&
        !PUBLIC_AUTH_PATHS.some(p => req.url.includes(p))
      ) {
        authService.signOut();
      }
      return throwError(() => err);
    }),
  );
};
