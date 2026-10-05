import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { PricingSettings } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { SarPipe } from '@shared/pipes/format.pipes';
import { ToggleComponent } from '@shared/ui/toggle/toggle.component';
import { Mutation } from '../../services/mutation';

interface UnitBounds {
  unitId: Uuid;
  name: string;
  basePrice: number;
  /** Text inputs; empty = no bound. */
  minPrice: string;
  maxPrice: string;
}

function toBounds(settings: PricingSettings): UnitBounds[] {
  return settings.units.map((u) => ({
    unitId: u.id,
    name: u.name,
    basePrice: u.basePrice,
    minPrice: u.minPrice?.toString() ?? '',
    maxPrice: u.maxPrice?.toString() ?? '',
  }));
}

/** Smart-pricing rules of a property: auto-apply and the price floor / ceiling of each unit. */
@Component({
  selector: 'app-pricing-settings-card',
  imports: [TranslatePipe, SarPipe, ToggleComponent],
  template: `
    <h3 class="h3 mb-8">{{ 'operator.pricing.rules.title' | translate }}</h3>
    <div class="setting-row">
      <div>
        <div class="b small">{{ 'operator.pricing.rules.auto' | translate }}</div>
        <div class="xs muted">{{ 'operator.pricing.rules.autoHint' | translate }}</div>
      </div>
      <app-toggle [(checked)]="autoApply" [label]="'operator.pricing.rules.auto' | translate" />
    </div>
    @for (u of bounds(); track u.unitId; let i = $index) {
      <div class="mt-12">
        <div class="b small">{{ u.name }} <span class="xs muted">• {{ 'operator.pricing.rules.base' | translate: { price: (u.basePrice | sar) } }}</span></div>
        <div class="row mt-4">
          <input
            class="input"
            type="number"
            min="1"
            #min
            [value]="u.minPrice"
            [placeholder]="'operator.pricing.rules.min' | translate"
            [attr.aria-label]="'operator.pricing.rules.minFor' | translate: { unit: u.name }"
            (input)="setBound(i, 'minPrice', min.value)"
          />
          <input
            class="input"
            type="number"
            min="1"
            #max
            [value]="u.maxPrice"
            [placeholder]="'operator.pricing.rules.max' | translate"
            [attr.aria-label]="'operator.pricing.rules.maxFor' | translate: { unit: u.name }"
            (input)="setBound(i, 'maxPrice', max.value)"
          />
        </div>
      </div>
    }
    <p class="xs muted mt-8">{{ 'operator.pricing.rules.boundsHint' | translate }}</p>
    <button type="button" class="btn btn-primary btn-sm mt-12" [disabled]="saving.busy()" (click)="save()">{{ 'common.save' | translate }}</button>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingSettingsCardComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);

  readonly propertyId = input.required<Uuid>();
  readonly settings = input.required<PricingSettings>();
  readonly saved = output<PricingSettings>();

  protected readonly autoApply = linkedSignal(() => this.settings().autoApply);
  protected readonly bounds = linkedSignal(() => toBounds(this.settings()));
  protected readonly saving = new Mutation();

  protected setBound(index: number, key: 'minPrice' | 'maxPrice', value: string): void {
    this.bounds.update((list) => list.map((u, i) => (i === index ? { ...u, [key]: value } : u)));
  }

  protected save(): void {
    const bound = (value: string): number | null => (value.trim() === '' ? null : Number(value));
    const body = {
      autoApply: this.autoApply(),
      units: this.bounds().map((u) => ({ unitId: u.unitId, minPrice: bound(u.minPrice), maxPrice: bound(u.maxPrice) })),
    };
    this.saving.run(this.api.updatePricingSettings(this.propertyId(), body), (settings) => {
      this.toast.success('operator.pricing.rules.saved');
      this.saved.emit(settings);
    });
  }
}
