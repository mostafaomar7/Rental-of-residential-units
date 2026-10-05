import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PromoPreview, PropertyDetail, PublicUnit, Quote, QuotePricing } from '@api/dto';
import { LangService } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { AppDatePipe, PluralPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { QuoteBreakdownComponent } from '../../../components/quote-breakdown/quote-breakdown.component';
import { quoteIssueKeys } from '../../../utils/quote-issues';
import { BookingDraft } from '../booking-draft';
import { StepNavComponent } from './step-nav.component';

/** Step 1 — unit, dates, guests, availability, promo code, free cleaning and the price (SRS BKG-02/04). */
@Component({
  selector: 'app-dates-step',
  imports: [TranslatePipe, AppDatePipe, PluralPipe, FieldComponent, IconComponent, LoadStateComponent, QuoteBreakdownComponent, StepNavComponent],
  template: `
    @let p = property();
    @let u = unit();
    @let d = draft();
    <h2 class="h3">{{ 'account.booking.dates.title' | translate }}</h2>
    @if (p.units.length > 1) {
      <div class="mt-16">
        <app-field [label]="'account.booking.dates.unitLabel' | translate" for="bk-unit">
          <select id="bk-unit" class="select" (change)="patch.emit({ unitId: $any($event.target).value })">
            @for (option of p.units; track option.id) {
              <option [value]="option.id" [selected]="option.id === u.id">{{ option.name }}</option>
            }
          </select>
        </app-field>
      </div>
    }
    <div class="grid g3 mt-16">
      <app-field [label]="'account.booking.dates.checkInLabel' | translate: { time: (p.policies.checkInTime | appDate: 'time') }" for="bk-in">
        <input type="date" id="bk-in" class="input" [value]="d.checkIn" [min]="minCheckIn" (change)="setDates($any($event.target).value, d.checkOut)" />
      </app-field>
      <app-field [label]="'account.booking.dates.checkOutLabel' | translate: { time: (p.policies.checkOutTime | appDate: 'time') }" for="bk-out">
        <input type="date" id="bk-out" class="input" [value]="d.checkOut" [min]="minCheckOut" (change)="setDates(d.checkIn, $any($event.target).value)" />
      </app-field>
      <app-field [label]="'account.booking.dates.guestsLabel' | translate" for="bk-g" [help]="'account.booking.dates.maxGuests' | translate: { max: u.maxGuests }">
        <select id="bk-g" class="select" (change)="patch.emit({ guests: +$any($event.target).value })">
          @for (n of guestOptions(); track n) {
            <option [value]="n" [selected]="n === d.guests">{{ n | plural: 'common.guests' }}</option>
          }
        </select>
      </app-field>
    </div>

    @if (quote(); as q) {
      @if (q.available) {
        <div class="notice green mt-16">
          <app-icon name="calendar-check" />
          <div>
            <b>{{ 'account.booking.dates.available' | translate }}</b> —
            {{ 'account.booking.dates.availableRange' | translate: { nights: (q.nightsCount | plural: 'common.nights'), from: (d.checkIn | appDate), to: (d.checkOut | appDate) } }}
          </div>
        </div>
      } @else {
        <div class="notice red mt-16">
          <app-icon name="calendar-x" />
          <div>
            <b>{{ 'account.booking.dates.unavailable' | translate }}</b>
            @for (key of issues(); track key) {
              <div class="small">{{ key | translate: { min: q.minNights } }}</div>
            }
          </div>
        </div>
      }

      <div class="grid g2 mt-16">
        <app-field [label]="'account.booking.promo.label' | translate" for="bk-promo">
          @if (promo(); as applied) {
            <div class="row between soft">
              <span class="b ltr">{{ applied.code }}</span>
              <button type="button" class="link xs" (click)="removePromo.emit()">{{ 'account.booking.promo.remove' | translate }}</button>
            </div>
          } @else {
            <div class="row">
              <input
                id="bk-promo"
                class="input ltr"
                autocomplete="off"
                [placeholder]="'account.booking.promo.placeholder' | translate"
                [value]="promoCode()"
                (input)="promoCode.set($any($event.target).value.trim().toUpperCase())"
                (keydown.enter)="applyPromo.emit(promoCode())"
              />
              <button type="button" class="btn btn-ghost" [disabled]="!promoCode() || promoBusy()" (click)="applyPromo.emit(promoCode())">
                {{ 'account.booking.promo.apply' | translate }}
              </button>
            </div>
          }
        </app-field>
        @if (freeCleanings() > 0) {
          <label class="check">
            <input type="checkbox" [checked]="d.useFreeCleaning" (change)="patch.emit({ useFreeCleaning: $any($event.target).checked })" />
            <span>
              <b>{{ 'account.booking.freeCleaning.label' | translate }}</b><br />
              <span class="xs muted">{{ 'account.booking.freeCleaning.available' | translate: { count: freeCleanings() } }}</span>
            </span>
          </label>
        }
      </div>

      @if (pricing(); as pr) {
        <h3 class="bb mt-24">{{ 'account.booking.dates.priceBreakdown' | translate }}</h3>
        <div class="soft-lg mt-8">
          <app-quote-breakdown [pricing]="pr" [nights]="q.nightsCount" />
        </div>
      }

      <app-step-nav [showBack]="false" [blockedMessage]="q.available ? null : 'account.booking.errors.unavailable'" (next)="next.emit()" />
    } @else {
      <app-load-state class="mt-16" [error]="quoteError()" (retry)="retry.emit()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatesStepComponent {
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LangService);

  readonly property = input.required<PropertyDetail>();
  readonly unit = input.required<PublicUnit>();
  readonly draft = input.required<BookingDraft>();
  /** `null` while loading or after an error. */
  readonly quote = input.required<Quote | null>();
  readonly quoteError = input<unknown>(undefined);
  readonly pricing = input.required<QuotePricing | null>();
  readonly promo = input.required<PromoPreview | null>();
  readonly promoBusy = input(false);
  /** Free cleanings earned through loyalty (SRS LOY). */
  readonly freeCleanings = input(0);

  readonly patch = output<Partial<BookingDraft>>();
  readonly applyPromo = output<string>();
  readonly removePromo = output<void>();
  readonly retry = output<void>();
  readonly next = output<void>();

  protected readonly minCheckIn = today();
  protected readonly minCheckOut = addDays(today(), 1);
  protected readonly promoCode = signal('');
  protected readonly guestOptions = computed(() => Array.from({ length: this.unit().maxGuests }, (_, i) => i + 1));
  protected readonly issues = computed(() => {
    this.lang.lang();
    const quote = this.quote();
    return quote ? quoteIssueKeys(quote.issues, this.translate) : [];
  });

  /** Keeps check-out at least one night after check-in. */
  protected setDates(checkIn: string, checkOut: string): void {
    if (!checkIn) return;
    if (!checkOut || checkOut <= checkIn) {
      checkOut = addDays(checkIn, 1);
      this.toast.show('account.booking.dates.checkoutAdjusted');
    }
    this.patch.emit({ checkIn, checkOut });
  }
}
