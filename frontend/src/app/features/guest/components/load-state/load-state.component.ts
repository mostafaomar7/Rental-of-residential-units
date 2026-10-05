import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiError } from '@api/api-error';
import { errorKey } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

/**
 * Placeholder while a resource has no value: a spinner while loading, otherwise the translated
 * API error with a retry button (not offered for "not found").
 * `@if (res.hasValue()) { … } @else { <app-load-state [error]="res.error()" (retry)="res.reload()" /> }`
 */
@Component({
  selector: 'app-load-state',
  imports: [TranslatePipe, EmptyStateComponent, IconComponent],
  template: `
    @if (error()) {
      <app-empty-state [icon]="notFound() ? 'map-pin-off' : 'wifi-off'" [title]="'guest.load.errorTitle' | translate" [subtitle]="messageKey() | translate">
        @if (!notFound()) {
          <button type="button" class="btn btn-primary mt-16" (click)="retry.emit()">
            <app-icon name="refresh-cw" size="sm" />{{ 'guest.load.retry' | translate }}
          </button>
        }
        <ng-content />
      </app-empty-state>
    } @else {
      <div class="loading" role="status" [attr.aria-label]="'guest.load.loading' | translate"><span class="spin dark"></span></div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadStateComponent {
  private readonly translate = inject(TranslateService);

  readonly error = input<unknown>(undefined);
  readonly retry = output<void>();

  protected readonly notFound = computed(() => ApiError.from(this.error()).status === 404);
  protected readonly messageKey = computed(() => errorKey(this.error(), this.translate));
}
