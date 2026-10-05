import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ManagedBooking } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ToastService } from '@core/services/toast.service';
import { SarPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Mutation } from '../../services/mutation';

/** Host cancellation with a mandatory reason: the guest is refunded in full and the key revoked. */
@Component({
  selector: 'app-booking-cancel-modal',
  imports: [FormsModule, TranslatePipe, SarPipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operations.booking.cancel.title' | translate: { id: booking().number }" (closed)="closed.emit()">
      <p class="lh">{{ 'operations.booking.cancel.message' | translate: { amount: (booking().pricing.total | sar) } }}</p>
      <div class="mt-16">
        <app-field [label]="'operations.booking.cancel.reason' | translate" for="oc-reason">
          <textarea id="oc-reason" class="textarea" [placeholder]="'operations.booking.cancel.reasonPlaceholder' | translate" [(ngModel)]="reason"></textarea>
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-danger-solid" [disabled]="cancelling.busy() || !valid()" (click)="confirm()">
          {{ 'operations.booking.cancel.ok' | translate }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingCancelModalComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);

  readonly booking = input.required<ManagedBooking>();
  readonly closed = output<void>();
  readonly cancelled = output<ManagedBooking>();

  protected readonly reason = signal('');
  protected readonly valid = computed(() => !!this.reason().trim());
  protected readonly cancelling = new Mutation();

  protected confirm(): void {
    if (!this.valid()) return;
    this.cancelling.run(this.api.cancelBooking(this.booking().id, this.reason().trim()), (booking) => {
      this.toast.success('operations.booking.toast.cancelled');
      this.cancelled.emit(booking);
    });
  }
}
