import { inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { ToastService } from '@core/services/toast.service';

/**
 * One API mutation at a time for a component: `busy` disables its buttons while the request runs
 * and failures become a translated error toast. Create it in a field initializer:
 * `protected readonly saving = new Mutation();` then `this.saving.run(api.update(…), (p) => …)`.
 */
export class Mutation {
  private readonly toast = inject(ToastService);

  readonly busy = signal(false);

  run<T>(request: Observable<T>, onSuccess: (value: T) => void, onError?: (error: unknown) => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: onSuccess,
      error: (error: unknown) => (onError ? onError(error) : this.toast.apiError(error)),
    });
  }
}
