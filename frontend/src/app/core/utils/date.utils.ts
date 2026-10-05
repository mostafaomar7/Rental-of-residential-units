import { ApiDate } from '@api/api.types';

const DAY_MS = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, '0');

/** Calendar dates in the API are Saudi dates, whatever the browser's time zone. */
const KSA_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Parses a `YYYY-MM-DD` date at local noon, which keeps day arithmetic safe across DST changes. */
export function parseDate(date: ApiDate): Date {
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

export function toIsoDate(d: Date): ApiDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's date in Saudi Arabia (`YYYY-MM-DD`). */
export function today(): ApiDate {
  return KSA_DATE.format(new Date());
}

export function addDays(date: ApiDate, days: number): ApiDate {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Nights of the stay `[checkIn, checkOut)`. */
export function nightsBetween(checkIn: ApiDate, checkOut: ApiDate): number {
  return Math.round((parseDate(checkOut).getTime() - parseDate(checkIn).getTime()) / DAY_MS);
}
