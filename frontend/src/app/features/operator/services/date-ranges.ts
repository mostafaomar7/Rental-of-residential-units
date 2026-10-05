import { ApiDate, ApiInstant } from '@api/api.types';
import { addDays, today } from '@core/utils/date.utils';

export interface DateRange {
  startDate: ApiDate;
  /** Inclusive. */
  endDate: ApiDate;
}

/** Groups picked days into runs of consecutive days, e.g. for one block / rate request per run. */
export function consecutiveRanges(dates: readonly ApiDate[]): DateRange[] {
  const sorted = [...new Set(dates)].sort();
  const ranges: DateRange[] = [];
  for (const date of sorted) {
    const last = ranges.at(-1);
    if (last && addDays(last.endDate, 1) === date) last.endDate = date;
    else ranges.push({ startDate: date, endDate: date });
  }
  return ranges;
}

/** Local wall-clock date + `HH:mm` (as picked in the browser) → ISO instant for the API. */
export function localInstant(date: ApiDate, time: string): ApiInstant {
  return new Date(`${date}T${time}:00`).toISOString();
}

/** ISO instant → value of an `<input type="datetime-local">` in the browser's time zone. */
export function toDateTimeLocal(instant: ApiInstant): string {
  const d = new Date(instant);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `<input type="datetime-local">` value → ISO instant. */
export function fromDateTimeLocal(value: string): ApiInstant {
  return new Date(value).toISOString();
}

/** First day of the period ending today that spans `days` days. */
export function periodStart(days: number): ApiDate {
  return addDays(today(), -(days - 1));
}
