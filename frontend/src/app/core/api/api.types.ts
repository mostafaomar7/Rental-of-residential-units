/** Wire format shared by every endpoint (see the backend's docs/FRONTEND.md §2). */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T, M = PageMeta> {
  success: true;
  data: T;
  meta?: M;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

/** A paginated list. `meta` may carry endpoint-specific extras (e.g. `board`, `pendingNet`). */
export interface Page<T, M extends PageMeta = PageMeta> {
  items: T[];
  meta: M;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}

/** Query values accepted by {@link ApiClient}; `undefined`/`null`/`''` are dropped, arrays become `a,b`. */
export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];
export type Query = Record<string, QueryValue>;

/** Calendar date `YYYY-MM-DD` in Saudi time — keep it a string, never wrap it in `new Date()`. */
export type ApiDate = string;
/** Instant, ISO-8601 UTC. */
export type ApiInstant = string;
/** Wall-clock time `HH:mm` (KSA). */
export type ApiTime = string;
export type Uuid = string;

/** Every bilingual name comes as an Arabic/English pair; English may be missing. */
export interface Bilingual {
  nameAr: string;
  nameEn: string | null;
}

export type Lang = 'ar' | 'en';
