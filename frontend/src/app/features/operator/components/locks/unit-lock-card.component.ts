import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Lock, ManagedUnit } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../async-state.component';
import { LOCK_LOW_BATTERY } from '../../services/operator-badges.service';
import { LockActionsComponent } from './lock-actions.component';
import { PairLockDialogComponent, PairableUnit } from './pair-lock-dialog.component';

/** Smart lock of one unit: health, test code / sync / unpair, or pairing when none is paired. */
@Component({
  selector: 'app-unit-lock-card',
  imports: [
    TranslatePipe,
    AppDatePipe,
    IconComponent,
    StatusPillComponent,
    LoadingComponent,
    LoadErrorComponent,
    LockActionsComponent,
    PairLockDialogComponent,
  ],
  template: `
    <div class="soft-lg">
      <div class="row between wrap mb-8">
        <div class="bb">{{ unit().name }}</div>
        @if (lock(); as l) {
          <app-status-pill domain="lock" [code]="l.status" />
        }
      </div>
      @if (resource.isLoading()) {
        <app-loading />
      } @else if (resource.error()) {
        <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
      } @else if (lock(); as l) {
        <div class="grid g3">
          <div>
            <div class="xs muted b">{{ 'operations.locks.cols.provider' | translate }}</div>
            <div class="b small mt-4">{{ 'domain.api.lockProvider.' + l.provider | translate }}</div>
            <div class="xs muted ltr">{{ l.model ?? l.externalId }}</div>
          </div>
          <div>
            <div class="xs muted b">{{ 'operations.locks.cols.battery' | translate }}</div>
            @if (l.batteryLevel !== null) {
              <div class="b small mt-4" [class.red]="l.batteryLevel < lowBattery">{{ l.batteryLevel }}%</div>
              <div class="bar thin mt-4">
                <div [class]="l.batteryLevel < lowBattery ? 'battery-low' : 'battery-ok'" [style.width.%]="l.batteryLevel"></div>
              </div>
            } @else {
              <div class="b small mt-4 muted">—</div>
            }
          </div>
          <div>
            <div class="xs muted b">{{ 'operations.locks.cols.lastSync' | translate }}</div>
            <div class="b small mt-4">{{ l.lastSyncAt | appDate: 'dateTime' }}</div>
            @if (l.alerts.length) {
              <div class="xs red b" [title]="l.alerts.join(', ')">{{ 'operations.locks.alerts' | translate: { count: l.alerts.length } }}</div>
            }
          </div>
        </div>
        <div class="mt-12">
          <app-lock-actions [unitId]="unit().id" [unitName]="unit().name" (changed)="resource.set($event)" />
        </div>
      } @else {
        <div class="notice amber">
          <app-icon name="key-round" />
          <div class="grow">{{ 'operations.locks.noLock' | translate }}</div>
          <button type="button" class="btn btn-primary btn-xs" (click)="pairing.set(true)">{{ 'operations.locks.pair.action' | translate }}</button>
        </div>
      }
    </div>

    @if (pairing()) {
      <app-pair-lock-dialog [units]="pairable()" (closed)="pairing.set(false)" (paired)="onPaired($event)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .battery-low {
      background: var(--red-solid);
    }
    .battery-ok {
      background: var(--green-solid);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitLockCardComponent {
  private readonly api = inject(HostPropertiesApi);

  readonly unit = input.required<Pick<ManagedUnit, 'id' | 'name'>>();

  protected readonly lowBattery = LOCK_LOW_BATTERY;
  protected readonly pairing = signal(false);

  protected readonly resource = rxResource({
    params: () => this.unit().id,
    stream: ({ params }) => this.api.unitLock(params),
  });

  protected readonly lock = computed<Lock | null>(() => (this.resource.hasValue() ? this.resource.value() : null));
  protected readonly pairable = computed<PairableUnit[]>(() => [{ id: this.unit().id, label: this.unit().name }]);

  protected onPaired(lock: Lock): void {
    this.pairing.set(false);
    this.resource.set(lock);
  }
}
