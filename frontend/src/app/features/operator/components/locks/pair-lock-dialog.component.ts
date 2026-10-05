import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Lock, LockProvider } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Mutation } from '../../services/mutation';

export const LOCK_PROVIDERS: readonly LockProvider[] = ['TTLOCK', 'IGLOOHOME', 'NUKI', 'MANUAL', 'SIMULATOR'];

/** A unit the dialog can pair; `label` should name its property when several units are offered. */
export interface PairableUnit {
  id: Uuid;
  label: string;
}

/**
 * Pairs a smart lock with a unit. With one unit it pairs that unit; with several the user picks
 * one. MANUAL locks need the fixed door code.
 */
@Component({
  selector: 'app-pair-lock-dialog',
  imports: [FormsModule, TranslatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operations.locks.pair.title' | translate" (closed)="closed.emit()">
      <div class="stack">
        @if (units().length > 1) {
          <app-field [label]="'operator.common.unit' | translate" for="pl-unit">
            <select id="pl-unit" class="select" [(ngModel)]="unitId">
              @for (u of units(); track u.id) {
                <option [ngValue]="u.id">{{ u.label }}</option>
              }
            </select>
          </app-field>
        }
        <app-field [label]="'operations.locks.cols.provider' | translate" for="pl-provider">
          <select id="pl-provider" class="select" [(ngModel)]="provider">
            @for (p of providers; track p) {
              <option [ngValue]="p">{{ 'domain.api.lockProvider.' + p | translate }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'operations.locks.pair.externalId' | translate" for="pl-ext" [help]="'operations.locks.pair.externalIdHelp' | translate">
          <input id="pl-ext" class="input ltr d-block" [(ngModel)]="externalId" />
        </app-field>
        <app-field [label]="'operations.locks.pair.model' | translate" for="pl-model">
          <input id="pl-model" class="input ltr d-block" [(ngModel)]="model" />
        </app-field>
        @if (provider() === 'MANUAL') {
          <app-field [label]="'operations.locks.pair.staticCode' | translate" for="pl-code" [help]="'operations.locks.pair.staticCodeHelp' | translate">
            <input id="pl-code" class="input ltr d-block" inputmode="numeric" [(ngModel)]="staticCode" />
          </app-field>
        }
        <label class="check">
          <input type="checkbox" [(ngModel)]="supportsRemoteUnlock" />
          <span class="small">{{ 'operations.locks.pair.remoteUnlock' | translate }}</span>
        </label>
        <label class="check">
          <input type="checkbox" [(ngModel)]="supportsOfflineCodes" />
          <span class="small">{{ 'operations.locks.pair.offlineCodes' | translate }}</span>
        </label>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="pairing.busy() || !valid()" (click)="pair()">
          @if (pairing.busy()) {
            <span class="spin"></span>
          }
          {{ 'operations.locks.pair.submit' | translate }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PairLockDialogComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);

  readonly units = input.required<readonly PairableUnit[]>();
  readonly closed = output<void>();
  readonly paired = output<Lock>();

  protected readonly providers = LOCK_PROVIDERS;
  protected readonly unitId = linkedSignal<Uuid | null>(() => this.units()[0]?.id ?? null);
  protected readonly provider = signal<LockProvider>('TTLOCK');
  protected readonly externalId = signal('');
  protected readonly model = signal('');
  protected readonly staticCode = signal('');
  protected readonly supportsRemoteUnlock = signal(true);
  protected readonly supportsOfflineCodes = signal(true);
  protected readonly pairing = new Mutation();

  protected readonly valid = computed(
    () => !!this.unitId() && !!this.externalId().trim() && (this.provider() !== 'MANUAL' || !!this.staticCode().trim()),
  );

  protected pair(): void {
    const unitId = this.unitId();
    if (!unitId || !this.valid()) return;
    const body = {
      provider: this.provider(),
      externalId: this.externalId().trim(),
      model: this.model().trim() || null,
      supportsRemoteUnlock: this.supportsRemoteUnlock(),
      supportsOfflineCodes: this.supportsOfflineCodes(),
      ...(this.provider() === 'MANUAL' ? { staticCode: this.staticCode().trim() } : {}),
    };
    this.pairing.run(this.api.pairLock(unitId, body), (lock) => {
      this.toast.success('operations.locks.toast.paired');
      this.paired.emit(lock);
    });
  }
}
