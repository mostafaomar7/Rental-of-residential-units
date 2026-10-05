import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastKind, ToastService } from '@core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

const TOAST_ICONS: Record<ToastKind, string> = { ok: 'check-circle-2', err: 'alert-circle', info: 'info' };

/** Renders queued toasts. Mounted once in the app root. */
@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="t.kind" [class.out]="t.leaving">
          <app-icon [name]="icons[t.kind]" />
          <span>{{ t.text }}</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = TOAST_ICONS;
}
