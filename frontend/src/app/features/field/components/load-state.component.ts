import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { errorKey } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** What a field screen shows before its data arrives: a spinner, or the translated error with a retry button. */
@Component({
  selector: 'app-load-state',
  imports: [TranslatePipe, EmptyStateComponent, IconComponent],
  template: `
    @if (error()) {
      <div class="card mt-12">
        <app-empty-state icon="wifi-off" [title]="message() | translate">
          <button type="button" class="btn btn-ghost btn-sm mt-12" (click)="retry.emit()">
            <app-icon name="refresh-cw" size="sm" />{{ 'field.common.retry' | translate }}
          </button>
        </app-empty-state>
      </div>
    } @else {
      <div class="center mt-24" role="status">
        <span class="spin dark"></span>
        <div class="xs muted mt-8">{{ 'field.common.loading' | translate }}</div>
      </div>
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadStateComponent {
  private readonly translate = inject(TranslateService);

  /** The resource's `error()`; when empty the component shows the loading spinner. */
  readonly error = input<unknown>();
  readonly retry = output<void>();

  protected readonly message = computed(() => errorKey(this.error(), this.translate));
}
