import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

export type Portal = 'guest' | 'operator' | 'admin' | 'supervisor' | 'photographer';

export function portalOf(url: string): Portal {
  const segment = url.split(/[/?#]/)[1] ?? '';
  switch (segment) {
    case 'operator':
    case 'admin':
    case 'supervisor':
    case 'photographer':
      return segment;
    default:
      return 'guest';
  }
}

/** Which portal the current URL belongs to. */
@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly router = inject(Router);

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  current(): Portal {
    return portalOf(this.url());
  }
}
