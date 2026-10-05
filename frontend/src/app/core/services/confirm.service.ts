import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  /** Translation key or text. */
  title?: string;
  message: string;
  messageParams?: Record<string, unknown>;
  okLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Promise-based confirmation dialog, rendered once by `ConfirmHostComponent`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  settle(ok: boolean): void {
    const current = this.pending();
    this.pending.set(null);
    current?.resolve(ok);
  }
}
