import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { QuotePricing } from '@api/dto';
import { PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { KvComponent } from '@shared/ui/kv/kv.component';

/** Price breakdown of a stay as priced by the API (quote, promo preview or booking). */
@Component({
  selector: 'app-quote-breakdown',
  imports: [TranslatePipe, SarPipe, PluralPipe, KvComponent],
  template: `
    @let p = pricing();
    <app-kv [label]="'guest.quote.accommodation' | translate: { nights: (nights() | plural: 'common.nights') }">{{ p.originalAccommodation | sar }}</app-kv>
    @if (p.discount) {
      <app-kv [label]="'guest.quote.discount' | translate"><span class="green">-{{ p.discount | sar }}</span></app-kv>
    }
    @if (p.promo; as promo) {
      <app-kv [label]="'guest.quote.promo' | translate: { code: promo.code }"><span class="green">-{{ promo.discount | sar }}</span></app-kv>
    }
    <app-kv [label]="'guest.quote.cleaning' | translate">
      @if (p.cleaningWaived) {
        <span class="green">{{ 'guest.quote.free' | translate }}</span>
      } @else {
        {{ p.cleaningFee | sar }}
      }
    </app-kv>
    <app-kv [label]="'guest.quote.vat' | translate: { rate: p.vatPercent }">{{ p.vat | sar }}</app-kv>
    <div class="kv total">
      <span>{{ 'guest.quote.total' | translate }}</span>
      <span class="b">{{ p.total | sar }}</span>
    </div>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteBreakdownComponent {
  readonly pricing = input.required<QuotePricing>();
  readonly nights = input.required<number>();
}
