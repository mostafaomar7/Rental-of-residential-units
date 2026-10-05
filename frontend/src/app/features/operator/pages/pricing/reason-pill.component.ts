import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PricingReason } from '@api/dto';
import { LocalizePipe } from '@shared/pipes/localize.pipe';

/** Pill naming why a price moves (holiday, event, season, demand…), green when it raises the price. */
@Component({
  selector: 'app-reason-pill',
  imports: [LocalizePipe],
  template: `{{ reason() | loc: 'label' }} {{ reason().impactPercent > 0 ? '+' : '' }}{{ reason().impactPercent }}%`,
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReasonPillComponent {
  readonly reason = input.required<PricingReason>();

  protected readonly classes = computed(() => `pill pill-${this.reason().impactPercent >= 0 ? 'gold' : 'blue'}`);
}
