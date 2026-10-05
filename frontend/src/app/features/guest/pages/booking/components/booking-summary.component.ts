import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Booking, PropertyDetail, PublicUnit, Quote, QuotePricing } from '@api/dto';
import { nightsBetween } from '@core/utils/date.utils';
import { AppDatePipe, NumPipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { QuoteBreakdownComponent } from '../../../components/quote-breakdown/quote-breakdown.component';
import { coverOf } from '../../../utils/property-display';
import { BookingDraft } from '../booking-draft';

/** Sticky order summary beside the wizard: unit, dates, the API's price breakdown and rewards. */
@Component({
  selector: 'app-booking-summary',
  imports: [TranslatePipe, LocalizePipe, SarPipe, NumPipe, AppDatePipe, PluralPipe, IconComponent, KvComponent, QuoteBreakdownComponent],
  template: `
    @let p = property();
    @let d = draft();
    <div class="card card-p sticky-book">
      <div class="row gap-12">
        @if (cover(); as url) {
          <img class="unit-thumb" [src]="url" alt="" />
        }
        <div class="grow">
          <div class="bb small">{{ p | loc }}</div>
          <div class="xs muted">
            {{ unit().name }} • {{ p.city | loc }}
            @if (p.district) {
              • {{ p.district | loc }}
            }
          </div>
          <div class="xs mt-4 row gap-4">
            <span class="star"><app-icon name="star" size="sm" [fill]="true" /></span>{{ p.rating.average | num }}
            @if (p.operatingModel; as model) {
              • {{ 'domain.api.operatingModel.' + model | translate }}
            }
          </div>
        </div>
      </div>
      <hr class="divider" />
      @if (booking(); as b) {
        <app-kv [label]="'account.booking.number' | translate"><span class="ltr">{{ b.number }}</span></app-kv>
      }
      <app-kv [label]="'account.booking.checkIn' | translate">{{ d.checkIn | appDate: 'long' }} • {{ p.policies.checkInTime | appDate: 'time' }}</app-kv>
      <app-kv [label]="'account.booking.checkOut' | translate">{{ d.checkOut | appDate: 'long' }} • {{ p.policies.checkOutTime | appDate: 'time' }}</app-kv>
      <app-kv [label]="'account.booking.guests' | translate">{{ d.guests | plural: 'common.guests' }}</app-kv>
      @if (pricing(); as pr) {
        <hr class="divider" />
        <app-quote-breakdown [pricing]="pr" [nights]="nightCount()" />
      }
      @if (rewards(); as r) {
        <div class="notice gold mt-12 xs">
          <app-icon name="gift" size="sm" />
          <div [innerHTML]="'account.booking.rewardsNote' | translate: { cashback: (r.cashback | sar), points: r.points }"></div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .unit-thumb {
      width: 84px;
      height: 72px;
      border-radius: 14px;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingSummaryComponent {
  readonly property = input.required<PropertyDetail>();
  readonly unit = input.required<PublicUnit>();
  readonly draft = input.required<BookingDraft>();
  readonly pricing = input.required<QuotePricing | null>();
  /** Nights as quoted; falls back to the selected dates. */
  readonly nights = input<number | null>(null);
  readonly rewards = input<Quote['rewards'] | null>(null);
  readonly booking = input<Booking | null>(null);

  protected readonly cover = computed(() => coverOf(this.property()));
  protected readonly nightCount = computed(() => this.booking()?.nights ?? this.nights() ?? nightsBetween(this.draft().checkIn, this.draft().checkOut));
}
