import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LangService } from './lang.service';
import { parseDate } from '@core/utils/date.utils';

export type DateStyle = 'short' | 'medium' | 'long' | 'weekday' | 'weekdayShort' | 'month' | 'monthShort' | 'time' | 'dateTime';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'long' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  weekday: { weekday: 'long' },
  weekdayShort: { weekday: 'short' },
  month: { month: 'long', year: 'numeric' },
  monthShort: { month: 'short' },
  time: { hour: 'numeric', minute: '2-digit' },
  dateTime: { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' },
};

/** Locale-aware formatting of money, numbers, dates and plurals (SRS NFR-LOC-01). */
@Injectable({ providedIn: 'root' })
export class FormatService {
  private readonly lang = inject(LangService);
  private readonly translate = inject(TranslateService);

  /** Plain number with thousands separators and Latin digits, e.g. `1,200.5`. */
  num(value: number | null | undefined, maxFractionDigits = 1): string {
    return Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits });
  }

  /** Short number for chart axes, e.g. `850`, `1.2K`, `3.4M`. */
  compact(value: number | null | undefined): string {
    return Number(value ?? 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  }

  /** Amount in Saudi riyals; halalas shown with 2 decimals only when present: `1,200 ر.س`, `SAR 1,092.50`. */
  sar(value: number | null | undefined): string {
    const amount = Number(value ?? 0);
    const fraction = Number.isInteger(Math.round(amount * 100) / 100) ? 0 : 2;
    const text = amount.toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
    return this.translate.instant('common.sar', { amount: text });
  }

  /**
   * Formats an ISO date (`YYYY-MM-DD`), month (`YYYY-MM`), timestamp (`YYYY-MM-DD HH:mm`)
   * or time (`HH:mm`).
   */
  date(value: string | null | undefined, style: DateStyle = 'short'): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat(this.lang.locale(), DATE_OPTIONS[style]).format(this.toDate(value));
  }

  /** "2 hours ago" / "قبل ساعتين" for a timestamp. */
  relative(timestamp: string): string {
    const diffMin = Math.round((this.toDate(timestamp).getTime() - Date.now()) / 60_000);
    const rtf = new Intl.RelativeTimeFormat(this.lang.locale(), { numeric: 'auto' });
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHours = Math.round(diffMin / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(Math.round(diffHours / 24), 'day');
  }

  /**
   * Picks a plural form with `Intl.PluralRules` and translates `<baseKey>.<form>` with `{count}`.
   * Arabic uses zero/one/two/few/many/other; English uses one/other. Missing forms fall back to `other`.
   */
  plural(count: number, baseKey: string, params: Record<string, unknown> = {}): string {
    const form = new Intl.PluralRules(this.lang.lang()).select(count);
    const key = `${baseKey}.${form}`;
    const args = { count: this.num(count), ...params };
    const text = this.translate.instant(key, args);
    return text === key ? this.translate.instant(`${baseKey}.other`, args) : text;
  }

  private toDate(value: string): Date {
    if (/^\d{2}:\d{2}$/.test(value)) return new Date(`2000-01-01T${value}:00`);
    if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-01T12:00:00`);
    if (value.length > 10) return new Date(value.replace(' ', 'T'));
    return parseDate(value);
  }
}
