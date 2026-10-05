import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { BookingStatus } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { saveBlob } from '@core/utils/download.utils';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

/** Bookings that can still be cancelled by the platform. */
const CANCELLABLE: readonly BookingStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'];
/** Invoices exist once a booking has been paid. */
const INVOICED: readonly BookingStatus[] = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const FULL_REFUND = 100;

/** One booking: stay, guest, price, the money split between platform and owner, invoice and cancellation. */
@Component({
  selector: 'app-booking-detail-modal',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, LocalizePipe, ModalComponent, KvComponent, FieldComponent, IconComponent, StatusPillComponent, ResourceStateComponent],
  templateUrl: './booking-detail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailModalComponent {
  private readonly api = inject(AdminPlatformApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly bookingId = input.required<Uuid>();
  readonly changed = output<void>();
  readonly closed = output<void>();

  protected readonly booking = rxResource({ params: () => this.bookingId(), stream: ({ params }) => this.api.booking(params) });
  protected readonly financials = rxResource({ params: () => this.bookingId(), stream: ({ params }) => this.api.bookingFinancials(params) });

  protected readonly cancellable = computed(() => this.booking.hasValue() && CANCELLABLE.includes(this.booking.value().status));
  protected readonly invoiced = computed(() => this.booking.hasValue() && INVOICED.includes(this.booking.value().status));

  protected readonly cancelling = signal(false);
  protected readonly reason = signal('');
  protected readonly refundPercent = signal(FULL_REFUND);
  protected readonly busy = signal(false);

  protected downloadInvoice(number: string): void {
    this.busy.set(true);
    this.api.invoicePdf(this.bookingId()).subscribe({
      next: (blob) => {
        this.busy.set(false);
        saveBlob(blob, `invoice-${number}.pdf`);
      },
      error: (err) => this.fail(err),
    });
  }

  protected async cancel(number: string): Promise<void> {
    const reason = this.reason().trim();
    const refundPercent = Number(this.refundPercent());
    if (!reason) return this.toast.error('admin.bookings.reasonRequired');
    if (!(refundPercent >= 0 && refundPercent <= FULL_REFUND)) return this.toast.error('admin.bookings.refundInvalid');
    const ok = await this.confirm.ask({
      title: 'admin.bookings.cancelTitle',
      message: 'admin.bookings.cancelMessage',
      messageParams: { number, pct: refundPercent },
      okLabel: 'admin.bookings.cancelOk',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.api.cancelBooking(this.bookingId(), reason, refundPercent).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.cancelling.set(false);
        this.booking.set(updated);
        this.financials.reload();
        this.toast.success('admin.bookings.cancelled', { number });
        this.changed.emit();
      },
      error: (err) => this.fail(err),
    });
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.toast.apiError(err);
  }
}
