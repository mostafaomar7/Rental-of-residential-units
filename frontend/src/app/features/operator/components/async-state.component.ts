import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { errorKey } from '@core/services/toast.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Spinner shown while a screen's data loads. */
@Component({
  selector: 'app-loading',
  imports: [TranslatePipe],
  template: `
    <div class="center loading" role="status">
      <span class="spin dark"></span>
      <span class="sr-only">{{ 'operator.common.loading' | translate }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .loading {
      padding: 40px 0;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent {}

/** Translated API error of a failed load, with a retry button. */
@Component({
  selector: 'app-load-error',
  imports: [TranslatePipe, EmptyStateComponent, IconComponent],
  template: `
    <app-empty-state icon="alert-triangle" [title]="message() | translate">
      <button type="button" class="btn btn-ghost mt-16" (click)="retry.emit()">
        <app-icon name="refresh-cw" size="sm" />{{ 'operator.common.retry' | translate }}
      </button>
    </app-empty-state>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadErrorComponent {
  private readonly translate = inject(TranslateService);

  readonly error = input.required<unknown>();
  readonly retry = output<void>();

  protected readonly message = computed(() => errorKey(this.error(), this.translate));
}
