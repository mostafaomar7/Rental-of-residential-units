import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { ManagedBooking } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, NumPipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { AccessEventRowComponent } from '../../components/access-event-row.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { OpenDamageDialogComponent } from '../../components/open-damage-dialog.component';
import { Mutation } from '../../services/mutation';
import { BookingCancelModalComponent } from './booking-cancel-modal.component';
import { ComplianceCardComponent } from './compliance-card.component';
import { GuestKeyCardComponent } from './guest-key-card.component';

const ACCESS_LOG_SIZE = 10;

type StayAction = 'checkIn' | 'checkOut' | 'noShow';

/** `/operator/booking/:id` — guest, pricing, policy snapshot, stay actions, digital key, compliance and access log. */
@Component({
  selector: 'app-booking-detail-page',
  imports: [
    RouterLink,
    TranslatePipe,
    AppDatePipe,
    NumPipe,
    PluralPipe,
    SarPipe,
    LocalizePipe,
    EmptyStateComponent,
    IconComponent,
    KvComponent,
    PageHeaderComponent,
    StatusPillComponent,
    LoadingComponent,
    LoadErrorComponent,
    AccessEventRowComponent,
    BookingCancelModalComponent,
    ComplianceCardComponent,
    GuestKeyCardComponent,
    OpenDamageDialogComponent,
  ],
  templateUrl: './booking-detail.page.html',
  styles: `
    .detail-grid {
      gap: 20px;
      align-items: start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailPage {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly id = input.required<string>();

  protected readonly modal = signal<'cancel' | 'damage' | null>(null);
  protected readonly stayAction = new Mutation();

  protected readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.booking(params),
  });

  protected readonly accessLog = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.accessLogs({ bookingId: params, limit: ACCESS_LOG_SIZE }),
  });

  /** `05xxxxxxxx` / `+9665…` → `9665…` for wa.me links. */
  protected readonly whatsappUrl = computed(() => {
    if (!this.resource.hasValue()) return '';
    const digits = this.resource.value().guestMobile.replace(/\D/g, '');
    return `https://wa.me/${digits.startsWith('0') ? `966${digits.slice(1)}` : digits}`;
  });

  protected async runStayAction(action: StayAction): Promise<void> {
    const booking = this.resource.value();
    if (!booking) return;
    const ok = await this.confirm.ask({
      title: `operations.booking.actions.${action}.title`,
      message: `operations.booking.actions.${action}.message`,
      messageParams: { guest: booking.guestName },
      okLabel: `operations.booking.actions.${action}.ok`,
      danger: action === 'noShow',
    });
    if (!ok) return;
    const requests: Record<StayAction, () => Observable<ManagedBooking>> = {
      checkIn: () => this.api.checkIn(booking.id),
      checkOut: () => this.api.checkOut(booking.id),
      noShow: () => this.api.noShow(booking.id),
    };
    this.stayAction.run(requests[action](), (updated) => {
      this.toast.success(`operations.booking.actions.${action}.done`);
      this.resource.set(updated);
    });
  }

  protected onCancelled(booking: ManagedBooking): void {
    this.modal.set(null);
    this.resource.set(booking);
  }
}
