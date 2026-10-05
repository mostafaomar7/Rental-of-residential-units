import { Pipe, PipeTransform, inject } from '@angular/core';
import { LangService } from '@core/services/lang.service';

/** Any API object carrying `<field>Ar` / `<field>En` strings. */
type Localizable = object | null | undefined;

/**
 * Picks the active language from an API object's Arabic/English pair, falling back to Arabic
 * (English is often missing). `field` is the pair's prefix:
 * `city | loc` → `nameAr`/`nameEn`, `property | loc:'description'` → `descriptionAr`/`descriptionEn`.
 */
@Pipe({ name: 'loc', pure: false })
export class LocalizePipe implements PipeTransform {
  private readonly lang = inject(LangService);

  transform(value: Localizable, field = 'name'): string {
    return localize(value, field, this.lang.lang());
  }
}

export function localize(value: Localizable, field: string, lang: 'ar' | 'en'): string {
  if (!value) return '';
  const record = value as Record<string, unknown>;
  const ar = record[`${field}Ar`];
  const en = record[`${field}En`];
  const picked = lang === 'en' && typeof en === 'string' && en.trim() ? en : ar;
  return typeof picked === 'string' ? picked : '';
}
