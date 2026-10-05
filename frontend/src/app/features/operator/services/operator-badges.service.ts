import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HostInsightsApi } from '@api/endpoints/host-insights.api';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { Lock } from '@api/dto';

/** Battery percentage under which a lock needs a field visit. */
export const LOCK_LOW_BATTERY = 30;

/** Offline, low battery or reporting provider alerts. */
export function lockNeedsAttention(lock: Lock): boolean {
  return lock.status !== 'ONLINE' || lock.alerts.length > 0 || (lock.batteryLevel !== null && lock.batteryLevel < LOCK_LOW_BATTERY);
}

/**
 * Counters shown on the portal navigation and the dashboard alerts: pending price suggestions,
 * open incidents and locks needing attention. Provided by the portal layout; pages call
 * {@link refresh} after changing one of them.
 */
@Injectable()
export class OperatorBadgesService {
  private readonly insightsApi = inject(HostInsightsApi);
  private readonly operationsApi = inject(HostOperationsApi);
  private readonly propertiesApi = inject(HostPropertiesApi);

  private readonly pricingResource = rxResource({
    stream: () => this.insightsApi.recommendations({ status: 'PENDING', limit: 1 }).pipe(map((page) => page.meta.total)),
  });
  private readonly incidentsResource = rxResource({
    stream: () => this.operationsApi.incidents({ status: 'OPEN', limit: 1 }).pipe(map((page) => page.meta.total)),
  });
  private readonly locksResource = rxResource({ stream: () => this.propertiesApi.locks() });

  readonly pendingPricing = computed(() => (this.pricingResource.hasValue() ? this.pricingResource.value() : 0));
  readonly openIncidents = computed(() => (this.incidentsResource.hasValue() ? this.incidentsResource.value() : 0));
  readonly lockAlerts = computed<Lock[]>(() => (this.locksResource.hasValue() ? this.locksResource.value().filter(lockNeedsAttention) : []));

  refresh(): void {
    this.pricingResource.reload();
    this.incidentsResource.reload();
    this.locksResource.reload();
  }
}
