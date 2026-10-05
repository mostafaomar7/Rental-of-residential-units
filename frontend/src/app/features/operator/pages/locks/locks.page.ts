import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { Uuid } from '@api/api.types';
import { Lock } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { LangService } from '@core/services/lang.service';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { localize } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { AccessEventRowComponent } from '../../components/access-event-row.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { LockActionsComponent } from '../../components/locks/lock-actions.component';
import { PairLockDialogComponent, PairableUnit } from '../../components/locks/pair-lock-dialog.component';
import { localInstant } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';
import { LOCK_LOW_BATTERY, OperatorBadgesService, lockNeedsAttention } from '../../services/operator-badges.service';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';

const RECENT_EVENTS = 8;
/** Failed-attempt counter window. */
const FAILED_WINDOW_DAYS = 7;
/** Battery level under which the gauge turns amber. */
const BATTERY_WARNING = 50;

/** `/operator/locks` — smart-lock health, pairing, test codes and the access log (SRS §ACC). */
@Component({
  selector: 'app-locks-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    StatTileComponent,
    StatusPillComponent,
    LoadingComponent,
    LoadErrorComponent,
    AccessEventRowComponent,
    LockActionsComponent,
    PairLockDialogComponent,
  ],
  templateUrl: './locks.page.html',
  styles: `
    .unit-title {
      min-width: 180px;
    }
    .battery-bar {
      width: 70px;
    }
    .cards-grid {
      gap: 24px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocksPage {
  private readonly propertiesApi = inject(HostPropertiesApi);
  private readonly operationsApi = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LangService);
  private readonly badges = inject(OperatorBadgesService);
  private readonly portfolio = inject(OperatorPortfolioService);

  protected readonly lowBattery = LOCK_LOW_BATTERY;
  protected readonly needsAttention = lockNeedsAttention;
  protected readonly pairing = signal(false);
  protected readonly creatingTask = new Mutation();

  protected readonly locks = rxResource({ stream: () => this.propertiesApi.locks() });

  protected readonly recentEvents = rxResource({
    stream: () => this.operationsApi.accessLogs({ limit: RECENT_EVENTS }).pipe(map((page) => page.items)),
  });

  protected readonly failedAttempts = rxResource({
    stream: () =>
      this.operationsApi
        .accessLogs({ success: false, from: localInstant(addDays(today(), -FAILED_WINDOW_DAYS), '00:00'), limit: 1 })
        .pipe(map((page) => page.meta.total)),
  });

  private readonly list = computed<Lock[]>(() => (this.locks.hasValue() ? this.locks.value() : []));

  protected readonly stats = computed(() => {
    const locks = this.list();
    const online = locks.filter((l) => l.status === 'ONLINE').length;
    return {
      total: locks.length,
      online,
      offline: locks.length - online,
      lowBattery: locks.filter((l) => l.batteryLevel !== null && l.batteryLevel < LOCK_LOW_BATTERY).length,
    };
  });

  /** Units without a lock, offered by the pairing dialog. */
  protected readonly unpairedUnits = computed<PairableUnit[]>(() => {
    const paired = new Set(this.list().map((l) => l.unitId));
    const lang = this.lang.lang();
    return this.portfolio
      .units()
      .filter((u) => !paired.has(u.id))
      .map((u) => ({ id: u.id, label: `${localize(u.property, 'name', lang)} — ${u.name}` }));
  });

  /** Unit names of the access log, from the portfolio. */
  protected unitName(unitId: Uuid): string {
    const unit = this.portfolio.unit(unitId);
    return unit ? `${localize(unit.property, 'name', this.lang.lang())} — ${unit.name}` : '';
  }

  protected batteryColor(level: number): string {
    if (level < LOCK_LOW_BATTERY) return 'var(--red-solid)';
    return level < BATTERY_WARNING ? '#F59E0B' : 'var(--green-solid)';
  }

  /** A row's actions synced (new state) or unpaired (`null`) its lock. */
  protected onLockChanged(unitId: Uuid, lock: Lock | null): void {
    this.locks.update((list) => (lock ? list?.map((l) => (l.unitId === unitId ? lock : l)) : list?.filter((l) => l.unitId !== unitId)));
    this.badges.refresh();
  }

  protected onPaired(lock: Lock): void {
    this.pairing.set(false);
    this.locks.update((list) => [...(list ?? []), lock]);
    this.badges.refresh();
  }

  /** Creates a maintenance task (battery / re-pairing) for the lock's unit. */
  protected createMaintenanceTask(lock: Lock): void {
    const body = {
      type: 'MAINTENANCE' as const,
      propertyId: lock.property.id,
      unitId: lock.unitId,
      title: this.translate.instant('operations.locks.maintenanceTask.title'),
      notes: lock.alerts.join(', ') || null,
      dueAt: new Date().toISOString(),
    };
    this.creatingTask.run(this.operationsApi.createTask(body), () => this.toast.success('operations.locks.toast.taskCreated'));
  }
}
