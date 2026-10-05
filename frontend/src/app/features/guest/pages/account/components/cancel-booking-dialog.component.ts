import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Booking } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { FormatService } from '@core/services/format.service';
import { ToastService } from '@core/services/toast.service';
import { NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { WalletService } from '../../../services/wallet.service';

/** Confirms a cancellation after showing the API's refund preview under the booking's policy (SRS BKG, WLT-05/06). */
@Component({
  selector: 'app-cancel-booking-dialog',
  imports: [TranslatePipe, SarPipe, NumPipe, FieldComponent, KvComponent, ModalComponent, LoadStateComponent],
  template: `
    @let b = booking();
    <app-modal size="sm" [title]="'account.cancel.title' | translate: { id: b.number }" (closed)="closed.emit()">
      @if (preview.hasValue()) {
        @let r = preview.value();
        @if (r.paid) {
          <p class="lh" [innerHTML]="'account.cancel.summary' | translate: { percent: r.refundPercent, hours: (r.hoursBeforeCheckIn | num: 0) }"></p>
        } @else {
          <p class="lh">{{ 'account.cancel.unpaid' | translate }}</p>
        }
        <div class="soft-lg mt-12">
          <app-kv [label]="'account.cancel.paid' | translate">{{ r.total | sar }}</app-kv>
          <app-kv [label]="'account.cancel.refund' | translate"><span class="green">{{ r.refundAmount | sar }}</span></app-kv>
        </div>
        @if (r.rewardsReversal.points || r.rewardsReversal.cashback) {
          <p class="xs muted mt-12 lh">
            {{ 'account.cancel.reversal' | translate: { cashback: (r.rewardsReversal.cashback | sar), points: r.rewardsReversal.points, deducted: (r.rewardsReversal.deductedFromRefund | sar) } }}
          </p>
        }
        <div class="mt-12">
          <app-field [label]="'account.cancel.reason' | translate" for="cn-reason">
            <textarea id="cn-reason" class="textarea" [value]="reason()" (input)="reason.set($any($event.target).value)"></textarea>
          </app-field>
        </div>
      } @else {
        <app-load-state [error]="preview.error()" (retry)="preview.reload()" />
      }
      <ng-container modal-footer>
        <button type="button" class="btn btn-danger-solid" [disabled]="busy() || !preview.hasValue()" (click)="confirm()">{{ 'account.cancel.confirm' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelBookingDialogComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly format = inject(FormatService);
  private readonly toast = inject(ToastService);
  private readonly wallet = inject(WalletService);

  readonly booking = input.required<Booking>();
  readonly closed = output<void>();
  readonly cancelled = output<Booking>();

  protected readonly reason = signal('');
  protected readonly busy = signal(false);

  protected readonly preview = rxResource({
    params: () => this.booking().id,
    stream: ({ params }) => this.bookingsApi.cancellationPreview(params),
  });

  protected confirm(): void {
    this.busy.set(true);
    this.bookingsApi.cancel(this.booking().id, this.reason().trim() || undefined).subscribe({
      next: (booking) => {
        this.busy.set(false);
        this.wallet.reload();
        this.toast.success('account.cancel.done', { amount: this.format.sar(booking.cancellation?.refundAmount ?? 0) });
        this.cancelled.emit(booking);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
