import { ApiDate } from '@api/api.types';
import { addDays, today } from '@core/utils/date.utils';

/** Default stay offered before the guest picks dates: arrive in 3 days, stay 2 nights. */
const DEFAULT_LEAD_DAYS = 3;
const DEFAULT_NIGHTS = 2;
export const DEFAULT_GUESTS = 2;
export const MAX_GUESTS = 16;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface StaySelection {
  checkIn: ApiDate;
  checkOut: ApiDate;
  guests: number;
}

export function defaultCheckIn(): ApiDate {
  return addDays(today(), DEFAULT_LEAD_DAYS);
}

/**
 * Stay read from URL params, validated: a check-in in the past or a check-out not after it
 * falls back to the defaults; guests are clamped to `1..maxGuests`.
 */
export function staySelection(checkIn?: string, checkOut?: string, guests?: string | number, maxGuests = MAX_GUESTS): StaySelection {
  const start = checkIn && ISO_DATE.test(checkIn) && checkIn >= today() ? checkIn : defaultCheckIn();
  const end = checkOut && ISO_DATE.test(checkOut) && checkOut > start ? checkOut : addDays(start, DEFAULT_NIGHTS);
  const count = Math.floor(Number(guests)) || DEFAULT_GUESTS;
  return { checkIn: start, checkOut: end, guests: Math.min(Math.max(1, maxGuests), Math.max(1, count)) };
}

/** Keeps check-out at least one night after check-in. */
export function withValidCheckOut(stay: StaySelection): StaySelection {
  return stay.checkOut > stay.checkIn ? stay : { ...stay, checkOut: addDays(stay.checkIn, 1) };
}

/** Query params that carry a stay between pages (`?in=&out=&guests=`). */
export function stayParams(stay: StaySelection): Record<string, string> {
  return { in: stay.checkIn, out: stay.checkOut, guests: String(stay.guests) };
}
