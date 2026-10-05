import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { Amenity, Catalog, City, PropertyType, PublicSettings } from '@api/dto';

/**
 * `/catalog` — cities, districts, property types, amenities, cancellation policies and public
 * settings (VAT, check-in times, loyalty rules…). Loaded once per session and shared.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(DiscoveryApi);

  private readonly resource = rxResource<Catalog, void>({ stream: () => this.api.catalog() });

  readonly catalog = computed(() => (this.resource.hasValue() ? this.resource.value() : null));
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  readonly cities = computed<City[]>(() => this.catalog()?.cities ?? []);
  readonly propertyTypes = computed<PropertyType[]>(() => this.catalog()?.propertyTypes ?? []);
  readonly amenities = computed<Amenity[]>(() => this.catalog()?.amenities ?? []);
  readonly cancellationPolicies = computed(() => this.catalog()?.cancellationPolicies ?? []);
  readonly settings = computed<PublicSettings | null>(() => this.catalog()?.settings ?? null);

  city(slugOrId: string | null | undefined): City | undefined {
    return this.cities().find((c) => c.slug === slugOrId || c.id === slugOrId);
  }

  reload(): void {
    this.resource.reload();
  }
}
