import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { ApiError } from './api-error';
import { ApiSuccess, Page, PageMeta, Query } from './api.types';

/**
 * Thin typed wrapper over HttpClient for the Rawaaf API: prefixes the base URL, unwraps the
 * `{ success, data, meta }` envelope and turns every failure into an {@link ApiError}.
 * Auth headers and token refresh are handled by the interceptors in `http/`.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, query?: Query): Observable<T> {
    return this.data(this.http.get<ApiSuccess<T>>(this.url(path), { params: toParams(query) }));
  }

  /** GET of a paginated list; `meta` is typed by the caller when the endpoint adds extras. */
  page<T, M extends PageMeta = PageMeta>(path: string, query?: Query): Observable<Page<T, M>> {
    return this.http.get<ApiSuccess<T[], M>>(this.url(path), { params: toParams(query) }).pipe(
      map((res) => ({ items: res.data, meta: res.meta as M })),
      catchError(rethrow),
    );
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.data(this.http.post<ApiSuccess<T>>(this.url(path), body));
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.data(this.http.put<ApiSuccess<T>>(this.url(path), body));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.data(this.http.patch<ApiSuccess<T>>(this.url(path), body));
  }

  delete<T = unknown>(path: string, body?: unknown): Observable<T> {
    return this.data(this.http.delete<ApiSuccess<T>>(this.url(path), { body }));
  }

  /** multipart/form-data upload — the browser sets the boundary header itself. */
  upload<T>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST'): Observable<T> {
    return this.data(this.http.request<ApiSuccess<T>>(method, this.url(path), { body: form }));
  }

  /** Authenticated binary download (PDF, CSV, private photos). */
  blob(path: string, query?: Query): Observable<Blob> {
    return this.http.get(this.url(path), { params: toParams(query), responseType: 'blob' }).pipe(catchError(rethrow));
  }

  /** Absolute API path → URL usable by HttpClient (accepts `/api/v1/...` links returned by the API). */
  url(path: string): string {
    if (/^https?:\/\//.test(path) || path.startsWith(this.baseUrl)) return path;
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  isApiUrl(url: string): boolean {
    return url.startsWith(this.baseUrl) || url.includes(`${this.baseUrl}/`);
  }

  private data<T>(request: Observable<ApiSuccess<T>>): Observable<T> {
    return request.pipe(
      map((res) => res.data),
      catchError(rethrow),
    );
  }
}

const rethrow = (error: unknown) => throwError(() => ApiError.from(error));

function toParams(query?: Query): HttpParams {
  let params = new HttpParams();
  if (!query) return params;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return params;
}
