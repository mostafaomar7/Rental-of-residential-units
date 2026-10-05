import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { TranslateService, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { MultiFileTranslateLoader } from '@core/i18n/multi-file-translate.loader';
import { TranslatedTitleStrategy } from '@core/i18n/translated-title.strategy';
import { DEFAULT_LANG, LangService } from '@core/services/lang.service';
import { AuthService } from '@core/services/auth.service';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { APP_ICONS } from '@shared/ui/icon/app-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    provideTranslateService({
      loader: provideTranslateLoader(MultiFileTranslateLoader),
      fallbackLang: DEFAULT_LANG,
    }),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) },
    // Load the active language before the first render so no raw keys flash on screen.
    provideAppInitializer(() => {
      const lang = inject(LangService);
      lang.init();
      return firstValueFrom(inject(TranslateService).use(lang.lang()));
    }),
    // Re-validate a stored session in the background; the cached profile renders meanwhile.
    provideAppInitializer(() => {
      void inject(AuthService).restore();
    }),
  ],
};
