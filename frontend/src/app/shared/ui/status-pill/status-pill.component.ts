import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { StatusDomain, statusTone } from '@core/status/status-tones';

/** Coloured status badge: `<app-status-pill domain="booking" [code]="b.status" />`. */
@Component({
  selector: 'app-status-pill',
  imports: [TranslatePipe],
  template: `{{ 'status.' + domain() + '.' + code() | translate }}`,
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPillComponent {
  readonly domain = input.required<StatusDomain>();
  readonly code = input.required<string>();

  protected readonly classes = computed(() => `pill pill-${statusTone(this.domain(), this.code())}`);
}
