import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Lang } from '@api/api.types';

const STORAGE_KEY = 'rawaaf_lang';
export const DEFAULT_LANG: Lang = 'ar';
export const SUPPORTED_LANGS: readonly Lang[] = ['ar', 'en'];

/** Active UI language; keeps `<html lang/dir>` and ngx-translate in sync. Arabic (RTL) is primary. */
@Injectable({ providedIn: 'root' })
export class LangService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(this.restore());
  readonly dir = computed(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  /** Locale for `Intl` formatting — Latin digits and Gregorian calendar in both languages (SRS NFR-LOC-01). */
  readonly locale = computed(() => (this.lang() === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB'));

  init(): void {
    this.translate.addLangs([...SUPPORTED_LANGS]);
    this.translate.setFallbackLang(DEFAULT_LANG);
    this.apply(this.lang());
  }

  use(lang: Lang): void {
    this.lang.set(lang);
    this.apply(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage unavailable — the choice lasts for this session only.
    }
  }

  toggle(): void {
    this.use(this.lang() === 'ar' ? 'en' : 'ar');
  }

  private apply(lang: Lang): void {
    this.translate.use(lang);
    const html = this.document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  private restore(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (SUPPORTED_LANGS as readonly string[]).includes(saved)) return saved as Lang;
    } catch {
      // ignore
    }
    return DEFAULT_LANG;
  }
}
