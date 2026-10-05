import { Injectable, computed, signal } from '@angular/core';
import { ApiDate } from '@api/api.types';
import { addDays } from '@core/utils/date.utils';

const KSA_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' });

/** Today's calendar date in Saudi time (`YYYY-MM-DD`), whatever the device's time zone. */
export function ksaToday(): ApiDate {
  return KSA_DATE.format(new Date());
}

/**
 * The day the field apps show tasks for. Kept in a root service so the chosen day survives
 * opening a task and coming back.
 */
@Injectable({ providedIn: 'root' })
export class FieldDayService {
  private readonly selected = signal(ksaToday());

  readonly date = this.selected.asReadonly();
  readonly isToday = computed(() => this.selected() === ksaToday());

  shift(days: number): void {
    this.selected.update((date) => addDays(date, days));
  }

  reset(): void {
    this.selected.set(ksaToday());
  }
}
