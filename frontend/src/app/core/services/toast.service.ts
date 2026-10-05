import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiError, CLIENT_ERROR } from '@api/api-error';

export type ToastKind = 'info' | 'ok' | 'err';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
  leaving: boolean;
}

const VISIBLE_MS = 2800;
const EXIT_MS = 320;

/** Translation key for an API error code (`errors.<CODE>`), falling back to a generic message. */
export function errorKey(error: unknown, translate: TranslateService): string {
  const code = ApiError.from(error).code;
  const key = `errors.${code}`;
  return translate.instant(key) === key ? `errors.${CLIENT_ERROR.unknown}` : key;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly translate = inject(TranslateService);
  private nextId = 0;

  readonly toasts = signal<Toast[]>([]);

  /** Shows a toast. `message` is a translation key (plain text also works — it falls through untranslated). */
  show(message: string, kind: ToastKind = 'info', params?: Record<string, unknown>): void {
    const toast: Toast = { id: ++this.nextId, kind, text: this.translate.instant(message, params), leaving: false };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), VISIBLE_MS);
  }

  success(message: string, params?: Record<string, unknown>): void {
    this.show(message, 'ok', params);
  }

  error(message: string, params?: Record<string, unknown>): void {
    this.show(message, 'err', params);
  }

  /** Error toast for a failed API call, translated from its stable `error.code`. */
  apiError(error: unknown): void {
    const min = ApiError.from(error).minLength;
    if (min !== null) this.error('errors.VALIDATION_MIN_LENGTH', { min });
    else this.error(errorKey(error, this.translate));
  }

  private dismiss(id: number): void {
    this.toasts.update((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => this.toasts.update((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }
}
