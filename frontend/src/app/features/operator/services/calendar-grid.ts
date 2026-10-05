import { ApiDate } from '@api/api.types';
import { addDays, parseDate, toIsoDate } from '@core/utils/date.utils';

/** One Sunday-first week (1 Jan 2023 was a Sunday); format with `appDate:'weekday'` for column headings. */
export const WEEKDAY_SAMPLE: readonly ApiDate[] = Array.from({ length: 7 }, (_, i) => addDays('2023-01-01', i));

/** Number of empty cells before `date` in a Sunday-first 7-column grid. */
export function leadingBlanks(date: ApiDate): number {
  return parseDate(date).getDay();
}

export interface MonthGrid {
  /** Month key `YYYY-MM` (format with `appDate:'month'`). */
  month: string;
  blanks: number;
  days: ApiDate[];
}

/** Days of the month `offset` months away from the month containing `from`. */
export function monthGrid(from: ApiDate, offset: number): MonthGrid {
  const base = parseDate(from);
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1, 12);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const start = toIsoDate(first);
  return {
    month: start.slice(0, 7),
    blanks: first.getDay(),
    days: Array.from({ length: daysInMonth }, (_, i) => addDays(start, i)),
  };
}
