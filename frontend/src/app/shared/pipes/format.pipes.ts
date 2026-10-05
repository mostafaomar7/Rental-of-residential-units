import { Pipe, PipeTransform, inject } from '@angular/core';
import { DateStyle, FormatService } from '@core/services/format.service';

// These pipes are impure because their output depends on the active language, which can change
// without their input changing. Each call is a cheap Intl/format operation.

/** `1200 | sar` → `1,200 ر.س` */
@Pipe({ name: 'sar', pure: false })
export class SarPipe implements PipeTransform {
  private readonly format = inject(FormatService);
  transform(value: number | null | undefined): string {
    return this.format.sar(value);
  }
}

/** `1234.56 | num` → `1,234.6` */
@Pipe({ name: 'num' })
export class NumPipe implements PipeTransform {
  private readonly format = inject(FormatService);
  transform(value: number | null | undefined, maxFractionDigits = 1): string {
    return this.format.num(value, maxFractionDigits);
  }
}

/** `'2026-09-29' | appDate` → `29 سبتمبر`; styles: short, medium, long, weekday, month, time, dateTime… */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly format = inject(FormatService);
  transform(value: string | null | undefined, style: DateStyle = 'short'): string {
    return this.format.date(value, style);
  }
}

/** `'2026-09-29 09:00' | relTime` → `قبل 3 ساعات` */
@Pipe({ name: 'relTime', pure: false })
export class RelTimePipe implements PipeTransform {
  private readonly format = inject(FormatService);
  transform(value: string): string {
    return this.format.relative(value);
  }
}

/** `3 | plural:'common.nights'` → `3 ليالٍ` (uses `common.nights.<form>` keys). */
@Pipe({ name: 'plural', pure: false })
export class PluralPipe implements PipeTransform {
  private readonly format = inject(FormatService);
  transform(count: number, baseKey: string, params?: Record<string, unknown>): string {
    return this.format.plural(count, baseKey, params);
  }
}

export const FORMAT_PIPES = [SarPipe, NumPipe, AppDatePipe, RelTimePipe, PluralPipe] as const;
