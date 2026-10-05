import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { PageMeta } from '@api/api.types';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';

/** Size of each admin work queue; `null` when that count could not be loaded. */
export interface AdminQueues {
  properties: number | null;
  photoShoots: number | null;
  /** Photo shoots requested by owners, awaiting a photographer. */
  shootRequests: number | null;
  disputes: number | null;
  bankAccounts: number | null;
  failedRefunds: number | null;
  integrationIssues: number | null;
}

const NO_COUNTS: AdminQueues = { properties: null, photoShoots: null, shootRequests: null, disputes: null, bankAccounts: null, failedRefunds: null, integrationIssues: null };

/** Reads only `meta.total` of a one-item page; a failing count never breaks the others. */
const total = (page: Observable<{ meta: PageMeta }>): Observable<number | null> =>
  page.pipe(
    map((p) => p.meta.total),
    catchError(() => of(null)),
  );

/**
 * Counters of the admin work queues, shared by the sidebar badges and the overview tiles.
 * Pages call {@link refresh} after a decision that changes a queue.
 */
@Injectable({ providedIn: 'root' })
export class AdminQueuesService {
  private readonly platformApi = inject(AdminPlatformApi);
  private readonly businessApi = inject(AdminBusinessApi);
  private readonly configApi = inject(AdminConfigApi);
  private readonly operationsApi = inject(HostOperationsApi);

  private readonly resource = rxResource<AdminQueues, void>({
    stream: () =>
      forkJoin({
        properties: total(this.platformApi.properties({ status: 'PENDING_REVIEW', limit: 1 })),
        photoShoots: total(this.operationsApi.tasks({ type: ['PHOTO_SHOOT'], status: ['SUBMITTED'], limit: 1 })),
        shootRequests: total(this.operationsApi.tasks({ type: ['PHOTO_SHOOT'], status: ['TODO'], unassigned: true, limit: 1 })),
        disputes: total(this.platformApi.damageCases({ status: 'DISPUTED', limit: 1 })),
        bankAccounts: total(this.businessApi.bankAccounts({ status: 'PENDING', limit: 1 })),
        failedRefunds: total(this.businessApi.refunds({ status: 'FAILED', limit: 1 })),
        integrationIssues: this.configApi.integrations().pipe(
          map((list) => list.filter((i) => i.status === 'DEGRADED' || i.status === 'ATTENTION').length),
          catchError(() => of(null)),
        ),
      }),
  });

  readonly counts = computed<AdminQueues>(() => (this.resource.hasValue() ? this.resource.value() : NO_COUNTS));
  readonly isLoading = this.resource.isLoading;

  refresh(): void {
    this.resource.reload();
  }
}
