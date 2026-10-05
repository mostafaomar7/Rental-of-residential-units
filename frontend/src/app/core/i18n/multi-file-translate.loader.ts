import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

/**
 * Translation files per language, one per area, under `public/i18n/<lang>/<file>.json`.
 * Each file holds its own top-level namespace(s) (e.g. `guest.json` → `{ "guest": { … } }`),
 * so areas can be edited independently without merge conflicts.
 */
export const TRANSLATION_FILES = ['common', 'domain', 'status', 'guest', 'account', 'operator', 'operations', 'field', 'admin', 'auth', 'errors'] as const;

@Injectable()
export class MultiFileTranslateLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<TranslationObject> {
    const requests = TRANSLATION_FILES.map((file) =>
      this.http.get<TranslationObject>(`i18n/${lang}/${file}.json`).pipe(catchError(() => of({} as TranslationObject))),
    );
    return forkJoin(requests).pipe(map((parts) => Object.assign({}, ...parts) as TranslationObject));
  }
}
