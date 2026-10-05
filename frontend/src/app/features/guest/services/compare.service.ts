import { Injectable, computed, inject, signal } from '@angular/core';
import { Uuid } from '@api/api.types';
import { PropertyCard } from '@api/dto';
import { CatalogService } from '@core/services/catalog.service';

/** Used until the catalog's `max_compare_units` setting has loaded. */
const DEFAULT_MAX_COMPARE = 3;

/** Units picked for side-by-side comparison on the browsing pages (lasts for the tab). */
@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly catalog = inject(CatalogService);

  /** The picked cards, kept for the tray thumbnails. */
  readonly items = signal<readonly PropertyCard[]>([]);
  readonly ids = computed(() => this.items().map((p) => p.id));
  readonly max = computed(() => this.catalog.settings()?.max_compare_units ?? DEFAULT_MAX_COMPARE);

  has(id: Uuid): boolean {
    return this.ids().includes(id);
  }

  /** Adds or removes a unit. Returns `false` when the tray is already full. */
  toggle(card: PropertyCard): boolean {
    if (this.has(card.id)) {
      this.items.update((list) => list.filter((p) => p.id !== card.id));
      return true;
    }
    if (this.items().length >= this.max()) return false;
    this.items.update((list) => [...list, card]);
    return true;
  }

  clear(): void {
    this.items.set([]);
  }
}
