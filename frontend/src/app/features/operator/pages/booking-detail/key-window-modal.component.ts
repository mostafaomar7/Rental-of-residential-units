import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { GuestKey } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { fromDateTimeLocal, toDateTimeLocal } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';

/** Moves the guest key's validity window (e.g. early check-in or late check-out). */
@Component({
  selector: 'app-key-window-modal',
  imports: [FormsModule, TranslatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operations.booking.key.windowTitle' | translate" (closed)="closed.emit()">
      <div class="grid g2">
        <app-field [label]="'operations.booking.key.validFrom' | translate" for="kw-from">
          <input id="kw-from" class="input" type="datetime-local" [(ngModel)]="validFrom" />
        </app-field>
        <app-field [label]="'operations.booking.key.validTo' | translate" for="kw-to">
          <input id="kw-to" class="input" type="datetime-local" [min]="validFrom()" [(ngModel)]="validTo" />
        </app-field>
      </div>
      <p class="xs muted mt-12">{{ 'operations.booking.key.windowHint' | translate }}</p>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="saving.busy() || !valid()" (click)="save()">{{ 'common.save' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyWindowModalComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);

  readonly bookingId = input.required<Uuid>();
  readonly key = input.required<NonNullable<GuestKey['key']>>();
  readonly closed = output<void>();
  readonly saved = output<GuestKey>();

  protected readonly validFrom = linkedSignal(() => toDateTimeLocal(this.key().validFrom));
  protected readonly validTo = linkedSignal(() => toDateTimeLocal(this.key().validTo));
  protected readonly saving = new Mutation();
  protected readonly valid = computed(() => !!this.validFrom() && !!this.validTo() && this.validTo() > this.validFrom());

  protected save(): void {
    if (!this.valid()) return;
    const window = { validFrom: fromDateTimeLocal(this.validFrom()), validTo: fromDateTimeLocal(this.validTo()) };
    this.saving.run(this.api.changeKeyWindow(this.bookingId(), window), (key) => {
      this.toast.success('operations.booking.toast.windowChanged');
      this.saved.emit(key);
    });
  }
}
