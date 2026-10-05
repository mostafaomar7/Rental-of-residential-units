import { ApiDate, ApiInstant } from '@api/api.types';

/** Saudi Arabia has no daylight saving: calendar days always start at +03:00. */
const KSA_OFFSET = '+03:00';
const KSA_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Calendar date (`YYYY-MM-DD`, Saudi time) of an instant — for `<input type="date">`. */
export function saudiDate(instant: ApiInstant): ApiDate {
  return KSA_DATE.format(new Date(instant));
}

/** First instant of a Saudi calendar day. */
export function startOfSaudiDay(date: ApiDate): ApiInstant {
  return new Date(`${date}T00:00:00${KSA_OFFSET}`).toISOString();
}

/** Last instant of a Saudi calendar day. */
export function endOfSaudiDay(date: ApiDate): ApiInstant {
  return new Date(`${date}T23:59:59.999${KSA_OFFSET}`).toISOString();
}
