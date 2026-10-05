import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiDate, Uuid } from '@api/api.types';
import { AvailabilityDay } from '@api/dto';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { addDays, parseDate, today } from '@core/utils/date.utils';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../load-state/load-state.component';
import { StaySelection } from '../../utils/stay-dates';

/** A known Sunday, used to label the weekday columns (the week starts on Sunday). */
const A_SUNDAY = '2026-01-04';

function monthStart(date: ApiDate): ApiDate {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(month: ApiDate, delta: number): ApiDate {
  const d = parseDate(month);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return monthStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
}

/**
 * Month calendar of one unit (`GET /units/:id/availability`): nightly prices, unavailable nights,
 * and the selected stay. Tapping a night picks check-in, a later one picks check-out.
 */
@Component({
  selector: 'app-unit-availability',
  imports: [TranslatePipe, AppDatePipe, SarPipe, IconComponent, LoadStateComponent],
  template: `
    <div class="row between mb-12">
      <button type="button" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'guest.availability.previous' | translate" [disabled]="!canGoBack()" (click)="move(-1)">
        <app-icon name="chevron-right" size="sm" [mirror]="true" />
      </button>
      <b>{{ month() | appDate: 'month' }}</b>
      <button type="button" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'guest.availability.next' | translate" (click)="move(1)">
        <app-icon name="chevron-left" size="sm" [mirror]="true" />
      </button>
    </div>

    @if (days.hasValue()) {
      <div class="cal">
        @for (w of weekdays; track w) {
          <div class="cal-h">{{ w | appDate: 'weekdayShort' }}</div>
        }
        @for (blank of leadingBlanks(); track $index) {
          <div class="cal-d empty-d" aria-hidden="true"></div>
        }
        @for (d of days.value(); track d.date) {
          @let past = d.date < todayDate;
          <button
            type="button"
            class="cal-d"
            [class.blocked]="!d.available || past"
            [class.sel]="inStay(d.date)"
            [class.today]="d.date === todayDate"
            [disabled]="past"
            [attr.aria-pressed]="inStay(d.date)"
            (click)="pick(d)"
          >
            <span class="dn">{{ d.date.slice(8) }}</span>
            @if (d.available && !past) {
              <span class="xs">{{ d.price | sar }}</span>
            }
          </button>
        }
      </div>
      <p class="xs muted mt-8">{{ (pickingCheckOut() ? 'guest.availability.pickCheckOut' : 'guest.availability.pickCheckIn') | translate }}</p>
    } @else {
      <app-load-state [error]="days.error()" (retry)="days.reload()" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .cal-d:disabled {
      cursor: default;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitAvailabilityComponent {
  private readonly discoveryApi = inject(DiscoveryApi);

  readonly unitId = input.required<Uuid>();
  readonly stay = input.required<StaySelection>();
  readonly stayChange = output<StaySelection>();

  protected readonly todayDate = today();
  protected readonly weekdays = Array.from({ length: 7 }, (_, i) => addDays(A_SUNDAY, i));

  /** Shown month — follows the selected check-in until the guest pages away. */
  protected readonly month = linkedSignal(() => monthStart(this.stay().checkIn));
  protected readonly pickingCheckOut = signal(false);

  protected readonly days = rxResource({
    params: () => ({ unitId: this.unitId(), from: this.month(), to: shiftMonth(this.month(), 1) }),
    // Whether `to` is inclusive is up to the API — keep exactly the shown month.
    stream: ({ params }) =>
      this.discoveryApi.availability(params.unitId, params.from, params.to).pipe(map((days) => days.filter((d) => d.date < params.to))),
  });

  protected readonly canGoBack = computed(() => this.month() > monthStart(this.todayDate));
  protected readonly leadingBlanks = computed(() => Array.from({ length: parseDate(this.month()).getDay() }));

  protected inStay(date: ApiDate): boolean {
    const { checkIn, checkOut } = this.stay();
    return date >= checkIn && date < checkOut;
  }

  protected move(delta: number): void {
    this.month.set(shiftMonth(this.month(), delta));
  }

  protected pick(day: AvailabilityDay): void {
    const stay = this.stay();
    if (this.pickingCheckOut() && day.date > stay.checkIn) {
      this.pickingCheckOut.set(false);
      this.stayChange.emit({ ...stay, checkOut: day.date });
      return;
    }
    if (!day.available) return;
    this.pickingCheckOut.set(true);
    this.stayChange.emit({ ...stay, checkIn: day.date, checkOut: addDays(day.date, Math.max(1, day.minNights)) });
  }
}
