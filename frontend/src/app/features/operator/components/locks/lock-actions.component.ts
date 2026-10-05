import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { DoorCode, Lock } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { Mutation } from '../../services/mutation';
import { DoorCodeModalComponent } from '../door-code-modal.component';

/**
 * Test code, sync and unpair buttons for a unit's paired lock. Emits the refreshed lock after a
 * sync and `null` once unpaired.
 */
@Component({
  selector: 'app-lock-actions',
  imports: [TranslatePipe, IconComponent, DoorCodeModalComponent],
  template: `
    <div class="row wrap gap-4">
      <button type="button" class="btn btn-primary" [class]="size()" [disabled]="action.busy()" (click)="testCode()">
        <app-icon name="key-round" size="sm" />{{ 'operations.locks.testCode' | translate }}
      </button>
      <button type="button" class="btn btn-ghost" [class]="size()" [disabled]="action.busy()" (click)="sync()">
        <app-icon name="refresh-cw" size="sm" />{{ 'operations.locks.sync' | translate }}
      </button>
      <button type="button" class="btn btn-danger" [class]="size()" [disabled]="action.busy()" (click)="unpair()">
        {{ 'operations.locks.unpair' | translate }}
      </button>
    </div>
    @if (testCodeResult(); as code) {
      <app-door-code-modal
        [code]="code"
        [title]="'operations.locks.testCodeTitle' | translate"
        [subtitle]="unitName()"
        (closed)="testCodeResult.set(null)"
      />
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockActionsComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);

  readonly unitId = input.required<Uuid>();
  readonly unitName = input('');
  /** Button size class (`btn-xs` in tables, `btn-sm` in cards). */
  readonly size = input<'btn-xs' | 'btn-sm'>('btn-sm');
  readonly changed = output<Lock | null>();

  protected readonly action = new Mutation();
  protected readonly testCodeResult = signal<DoorCode | null>(null);

  protected testCode(): void {
    this.action.run(this.api.testCode(this.unitId()), (code) => this.testCodeResult.set(code));
  }

  protected sync(): void {
    this.action.run(this.api.syncLock(this.unitId()), (lock) => {
      this.toast.success(lock.status === 'ONLINE' ? 'operations.locks.toast.synced' : 'operations.locks.toast.syncedOffline');
      this.changed.emit(lock);
    });
  }

  protected async unpair(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'operations.locks.unpairConfirm.title',
      message: 'operations.locks.unpairConfirm.message',
      messageParams: { unit: this.unitName() || this.translate.instant('operator.common.unit') },
      okLabel: 'operations.locks.unpair',
      danger: true,
    });
    if (!ok) return;
    this.action.run(this.api.unpairLock(this.unitId()), ({ revokedKeys }) => {
      this.toast.show('operations.locks.toast.unpaired', 'info', { count: revokedKeys });
      this.changed.emit(null);
    });
  }
}
