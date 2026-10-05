import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { ApiSuccess } from '@api/api.types';
import { AuthTokens } from '@api/dto';
import { TokenStore } from './token-store.service';

/** Only this 401 means "refresh and retry"; any other 401 ends the session. */
const TOKEN_EXPIRED = 'TOKEN_EXPIRED';
const REFRESH_PATH = '/auth/refresh';

/** The refresh in flight, shared by every request that hit an expired token at the same time. */
let refreshing$: Observable<string> | null = null;

/**
 * Adds the bearer token to API requests and transparently refreshes it.
 * Refresh is single-flight: reusing a rotated refresh token would log the user out everywhere.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) return next(req);

  const tokens = inject(TokenStore);
  const rawHttp = new HttpClient(inject(HttpBackend));

  return next(withToken(req, tokens.accessToken)).pipe(
    catchError((error: unknown) => {
      if (!isExpiredToken(error) || !tokens.refreshToken) return throwError(() => error);
      return refreshOnce(rawHttp, tokens).pipe(switchMap((accessToken) => next(withToken(req, accessToken))));
    }),
  );
};

function refreshOnce(http: HttpClient, tokens: TokenStore): Observable<string> {
  refreshing$ ??= http
    .post<ApiSuccess<AuthTokens>>(`${environment.apiBaseUrl}${REFRESH_PATH}`, { refreshToken: tokens.refreshToken })
    .pipe(
      map((res) => {
        tokens.rotate(res.data);
        return res.data.accessToken;
      }),
      catchError((error: unknown) => {
        tokens.clear();
        tokens.expired$.next();
        return throwError(() => error);
      }),
      finalize(() => (refreshing$ = null)),
      shareReplay(1),
    );
  return refreshing$;
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl) && !url.endsWith(REFRESH_PATH);
}

function isExpiredToken(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 401 &&
    (error.error as { error?: { code?: string } } | null)?.error?.code === TOKEN_EXPIRED
  );
}
