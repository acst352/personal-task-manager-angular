import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.insforge.baseUrl)) {
    return next(req);
  }
  const userToken = localStorage.getItem('insforge_access_token');
  const token = userToken ?? environment.insforge.anonKey;
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
