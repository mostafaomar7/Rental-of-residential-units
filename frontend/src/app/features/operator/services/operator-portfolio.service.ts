import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { Uuid } from '@api/api.types';
import { PropertyRow, PropertyRowUnit } from '@api/dto';

/** Properties loaded for pickers (calendar, pricing, task forms…); the API caps one page at this size. */
const PICKER_LIMIT = 100;

/** A unit with the property it belongs to, for unit pickers. */
export interface PortfolioUnit extends PropertyRowUnit {
  property: Pick<PropertyRow, 'id' | 'nameAr' | 'nameEn'>;
}

/**
 * The signed-in host's properties and units, shared by every picker of the portal. Provided by the
 * portal layout, so it is loaded once per visit; call {@link reload} after creating or deleting.
 */
@Injectable()
export class OperatorPortfolioService {
  private readonly api = inject(HostPropertiesApi);

  private readonly resource = rxResource({
    stream: () => this.api.list({ limit: PICKER_LIMIT }).pipe(map((page) => page.items)),
  });

  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;
  readonly properties = computed<PropertyRow[]>(() => (this.resource.hasValue() ? this.resource.value() : []));

  readonly units = computed<PortfolioUnit[]>(() =>
    this.properties().flatMap((p) =>
      p.units.map((u) => ({ ...u, property: { id: p.id, nameAr: p.nameAr, nameEn: p.nameEn } })),
    ),
  );

  property(id: Uuid | null | undefined): PropertyRow | undefined {
    return this.properties().find((p) => p.id === id);
  }

  unit(id: Uuid | null | undefined): PortfolioUnit | undefined {
    return this.units().find((u) => u.id === id);
  }

  reload(): void {
    this.resource.reload();
  }
}
