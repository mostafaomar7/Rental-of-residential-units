import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Uuid } from '@api/api.types';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

/**
 * Guest favourites (SRS DSC-06): signed-in guests only; visitors are asked to sign in.
 * Cards arrive with `isFavorite`; choices made since then override that flag.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly overrides = signal<ReadonlyMap<Uuid, boolean>>(new Map());
  private readonly pending = signal<ReadonlySet<Uuid>>(new Set());

  /** Bumped after every change so favourites lists can reload. */
  readonly version = signal(0);

  private readonly total = rxResource({
    params: () => (this.auth.isLoggedIn() ? { version: this.version() } : undefined),
    stream: () => this.meApi.favorites({ limit: 1 }).pipe(map((page) => page.meta.total)),
  });
  readonly count = computed(() => (this.total.hasValue() ? this.total.value() : 0));

  constructor() {
    // Another account (or none) — forget the previous user's choices.
    effect(() => {
      this.auth.user();
      this.overrides.set(new Map());
    });
  }

  isFavorite(propertyId: Uuid, loaded = false): boolean {
    return this.overrides().get(propertyId) ?? loaded;
  }

  isBusy(propertyId: Uuid): boolean {
    return this.pending().has(propertyId);
  }

  toggle(propertyId: Uuid, current: boolean): void {
    if (!this.auth.ensureLoggedIn() || this.isBusy(propertyId)) return;
    this.setPending(propertyId, true);
    const request = current ? this.meApi.removeFavorite(propertyId) : this.meApi.addFavorite(propertyId);
    request.subscribe({
      next: ({ isFavorite }) => {
        this.setPending(propertyId, false);
        this.overrides.update((all) => new Map(all).set(propertyId, isFavorite));
        this.version.update((v) => v + 1);
        this.toast.show(isFavorite ? 'guest.favorites.added' : 'guest.favorites.removed', isFavorite ? 'ok' : 'info');
      },
      error: (err: unknown) => {
        this.setPending(propertyId, false);
        this.toast.apiError(err);
      },
    });
  }

  private setPending(propertyId: Uuid, busy: boolean): void {
    this.pending.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(propertyId);
      else next.delete(propertyId);
      return next;
    });
  }
}
