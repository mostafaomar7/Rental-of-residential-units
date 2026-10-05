import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { PropertyDetail, PublicUnit } from '@api/dto';
import { AppDatePipe, NumPipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { mapsLink } from '../../utils/property-display';

/** "Details" tab of the unit page: capacity, description, operating model, units and location. */
@Component({
  selector: 'app-property-details-tab',
  imports: [TranslatePipe, LocalizePipe, NumPipe, PluralPipe, SarPipe, AppDatePipe, IconComponent],
  template: `
    @let p = property();
    @let u = unit();
    @if (u) {
      <div class="row wrap">
        <span class="chip chip-sm static"><app-icon name="users" size="sm" />{{ u.maxGuests | plural: 'common.guests' }}</span>
        <span class="chip chip-sm static"><app-icon name="bed-double" size="sm" />{{ 'guest.property.details.bedrooms' | translate: { count: u.bedrooms } }}</span>
        <span class="chip chip-sm static"><app-icon name="bath" size="sm" />{{ 'guest.property.details.baths' | translate: { count: u.bathrooms } }}</span>
        <span class="chip chip-sm static">
          <app-icon name="star" size="sm" />{{ 'guest.property.details.rating' | translate: { rating: (p.rating.average | num), count: p.rating.count } }}
        </span>
      </div>
    }

    <p class="lh mt-16 pre-line">{{ p | loc: 'description' }}</p>

    <div class="grid g2 mt-16">
      @if (p.operatingModel; as model) {
        <div class="soft-lg">
          <div class="row b">
            <app-icon [name]="model === 'SUPERVISED' ? 'user-check' : 'key-round'" class="gold-dark" />{{ 'domain.api.operatingModel.' + model | translate }}
          </div>
          <p class="small muted mt-4 lh">{{ 'guest.property.details.models.' + model | translate }}</p>
        </div>
      }
      <div class="soft-lg">
        <div class="row b"><app-icon name="clock" class="gold-dark" />{{ 'guest.property.details.times' | translate }}</div>
        <p class="small muted mt-4 lh">
          {{ 'guest.property.details.timesBody' | translate: { checkIn: (p.policies.checkInTime | appDate: 'time'), checkOut: (p.policies.checkOutTime | appDate: 'time') } }}
        </p>
      </div>
    </div>

    @if (p.units.length > 1) {
      <h3 class="h3 mt-24">{{ 'guest.property.details.units' | translate }}</h3>
      <div class="stack-sm mt-12">
        @for (unit of p.units; track unit.id) {
          <button type="button" class="radio-card" [class.on]="unit.id === u?.id" [attr.aria-pressed]="unit.id === u?.id" (click)="unitChange.emit(unit.id)">
            <span class="start">
              <span class="b d-block">{{ unit.name }}</span>
              <span class="xs muted">
                {{ unit.maxGuests | plural: 'common.guests' }} • {{ 'guest.property.details.bedrooms' | translate: { count: unit.bedrooms } }} •
                {{ 'guest.property.details.fromPrice' | translate: { price: (unit.basePrice | sar) } }}
              </span>
            </span>
            <span class="radio-dot"></span>
          </button>
        }
      </div>
    }

    <h3 class="h3 mt-24">{{ 'guest.property.details.location' | translate }}</h3>
    <div class="map-ph mt-12" role="img" [attr.aria-label]="'guest.property.details.mapLabel' | translate">
      <div class="map-pin"><app-icon name="home" /></div>
      <span class="pill pill-white map-label">
        {{ p.city | loc }}
        @if (p.district) {
          — {{ p.district | loc }}
        }
      </span>
      @if (mapUrl(); as url) {
        <a class="btn btn-primary btn-xs map-btn" [href]="url" target="_blank" rel="noopener">{{ 'guest.property.details.openMaps' | translate }}</a>
      }
    </div>
    <p class="xs muted mt-8">{{ 'guest.property.details.locationHint' | translate }}</p>
  `,
  styles: `
    :host {
      display: block;
    }
    .static {
      cursor: default;
    }
    .pre-line {
      white-space: pre-line;
    }
    .start {
      text-align: start;
    }
    .map-label {
      position: absolute;
      bottom: 12px;
      inset-inline-start: 12px;
    }
    .map-btn {
      position: absolute;
      bottom: 12px;
      inset-inline-end: 12px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyDetailsTabComponent {
  readonly property = input.required<PropertyDetail>();
  /** The unit being booked; its capacity is shown. */
  readonly unit = input.required<PublicUnit | null>();
  readonly unitChange = output<Uuid>();

  protected readonly mapUrl = computed(() => mapsLink(this.property().location?.latitude, this.property().location?.longitude));
}
