import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { errorKey } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** The parts of an Angular `Resource` this component reads (any `rxResource` fits). */
export interface LoadState {
  isLoading(): boolean;
  hasValue(): boolean;
  error(): unknown;
  reload(): unknown;
}

/**
 * Loading spinner (first load only) or translated error with a retry button for a resource.
 * The page renders its content itself under `@if (resource.hasValue())`.
 */
@Component({
  selector: 'app-resource-state',
  imports: [TranslatePipe, IconComponent],
  template: `
    @let res = resource();
    @if (res.error()) {
      <div class="notice red" role="alert">
        <app-icon name="alert-circle" />
        <div class="grow">{{ errorText() | translate }}</div>
        <button type="button" class="btn btn-ghost btn-xs" (click)="res.reload()"><app-icon name="rotate-cw" size="sm" />{{ 'admin.common.retry' | translate }}</button>
      </div>
    } @else if (res.isLoading() && !res.hasValue()) {
      <div class="loading" role="status" [attr.aria-label]="'admin.common.loading' | translate"><span class="spin dark"></span></div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .loading {
      display: grid;
      place-items: center;
      padding: 32px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceStateComponent {
  private readonly translate = inject(TranslateService);

  readonly resource = input.required<LoadState>();

  protected readonly errorText = computed(() => errorKey(this.resource().error(), this.translate));
}
