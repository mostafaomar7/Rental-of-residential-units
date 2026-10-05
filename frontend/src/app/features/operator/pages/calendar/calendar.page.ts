import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ApiDate, Uuid } from '@api/api.types';
import { CalendarDay } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { UnitSelectComponent } from '../../components/unit-select.component';
import { WEEKDAY_SAMPLE, monthGrid } from '../../services/calendar-grid';
import { consecutiveRanges } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';
import { BlockDialogComponent } from './block-dialog.component';
import { RatesDialogComponent } from './rates-dialog.component';
import { UnitDiscountsComponent } from './unit-discounts.component';

interface DayCell {
  date: ApiDate;
  day: number;
  info?: CalendarDay;
  past: boolean;
  today: boolean;
  selected: boolean;
}

/** `/operator/calendar?unit=` — month view per unit: bookings, blocks, nightly prices and discounts. */
@Component({
  selector: 'app-calendar-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    SarPipe,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    LoadingComponent,
    LoadErrorComponent,
    UnitSelectComponent,
    BlockDialogComponent,
    RatesDialogComponent,
    UnitDiscountsComponent,
  ],
  templateUrl: './calendar.page.html',
  styles: `
    .month-title {
      min-width: 140px;
      text-align: center;
    }
    .past {
      opacity: 0.45;
    }
    .override {
      font-weight: 700;
      color: var(--gold-dark);
    }
    .lg-booked {
      background: var(--navy);
    }
    .lg-blocked {
      background: #e6e1d5;
    }
    .lg-open {
      background: #fff;
      border: 1px solid #ddd;
    }
    .lg-selected {
      background: #fff;
      outline: 2px solid var(--gold);
    }
    .layout {
      gap: 24px;
      align-items: start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly api = inject(HostPropertiesApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly portfolio = inject(OperatorPortfolioService);

  /** `?unit=` deep link from a property profile. */
  readonly unit = input<string>();

  protected readonly weekdays = WEEKDAY_SAMPLE;
  protected readonly unitId = linkedSignal<Uuid | null>(() => this.unit() || this.portfolio.units()[0]?.id || null);
  protected readonly monthOffset = signal(0);
  protected readonly selection = signal<ApiDate[]>([]);
  protected readonly dialog = signal<'block' | 'rates' | null>(null);
  protected readonly unblocking = new Mutation();

  protected readonly grid = computed(() => monthGrid(today(), this.monthOffset()));
  protected readonly blanks = computed(() => Array.from({ length: this.grid().blanks }));

  protected readonly calendar = rxResource({
    params: () => {
      const unitId = this.unitId();
      const days = this.grid().days;
      // `to` is exclusive.
      return unitId ? { unitId, from: days[0], to: addDays(days[days.length - 1], 1) } : undefined;
    },
    stream: ({ params }) => this.api.calendar(params.unitId, params.from, params.to),
  });

  protected readonly cells = computed<DayCell[]>(() => {
    const days = this.calendar.hasValue() ? this.calendar.value().days : [];
    const byDate = new Map(days.map((d) => [d.date, d]));
    const selected = this.selection();
    const now = today();
    return this.grid().days.map((date) => ({
      date,
      day: Number(date.slice(8)),
      info: byDate.get(date),
      past: date < now,
      today: date === now,
      selected: selected.includes(date),
    }));
  });

  protected readonly ranges = computed(() => consecutiveRanges(this.selection()));

  /** Blocks covering selected blocked days (a blocked day's `occupancyId` is its block). */
  private readonly selectedBlockIds = computed(() => {
    const ids = this.cells().flatMap((c) => (c.selected && c.info?.status === 'blocked' && c.info.occupancyId ? [c.info.occupancyId] : []));
    return [...new Set(ids)];
  });

  protected selectUnit(id: Uuid | null): void {
    this.unitId.set(id);
    this.selection.set([]);
  }

  protected changeMonth(step: number): void {
    this.monthOffset.update((m) => m + step);
    this.selection.set([]);
  }

  protected onDay(cell: DayCell): void {
    if (cell.info?.bookingId) {
      void this.router.navigate(['/operator/booking', cell.info.bookingId]);
      return;
    }
    if (cell.past) {
      this.toast.error('operator.calendar.pastDay');
      return;
    }
    if (cell.info?.status === 'booked' || cell.info?.status === 'held') {
      this.toast.show('operator.calendar.bookedDay');
      return;
    }
    this.selection.update((s) => (s.includes(cell.date) ? s.filter((d) => d !== cell.date) : [...s, cell.date]));
  }

  protected openDialog(dialog: 'block' | 'rates'): void {
    if (!this.selection().length) {
      this.toast.error('operator.calendar.selectFirst');
      return;
    }
    this.dialog.set(dialog);
  }

  protected async unblock(): Promise<void> {
    const ids = this.selectedBlockIds();
    if (!ids.length) {
      this.toast.error('operator.calendar.noBlocksSelected');
      return;
    }
    const ok = await this.confirm.ask({ message: 'operator.calendar.unblockConfirm', messageParams: { count: ids.length } });
    if (!ok) return;
    this.unblocking.run(forkJoin(ids.map((id) => this.api.unblock(id))), () => {
      this.toast.success('operator.calendar.unblocked');
      this.afterChange();
    });
  }

  protected afterChange(): void {
    this.dialog.set(null);
    this.selection.set([]);
    this.calendar.reload();
  }
}
