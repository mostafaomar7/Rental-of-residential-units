import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Booking, BookingGroup, BookingStatus } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { MeApi } from '@api/endpoints/me.api';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { PagerComponent } from '../../../components/pager/pager.component';
import { ActiveStayService } from '../../../services/active-stay.service';
import { PaymentRedirectService } from '../../../services/payment-redirect.service';
import { coverOf } from '../../../utils/property-display';
import { BookingDetailsDialogComponent } from '../components/booking-details-dialog.component';
import { CancelBookingDialogComponent } from '../components/cancel-booking-dialog.component';

type ListGroup = Exclude<BookingGroup, 'all'>;

const GROUP_TABS: readonly TabItem<ListGroup>[] = [
  { id: 'upcoming', label: 'account.bookings.groups.upcoming' },
  { id: 'past', label: 'account.bookings.groups.past' },
  { id: 'cancelled', label: 'account.bookings.groups.cancelled' },
];
const PAGE_SIZE = 10;
/** Statuses with an issued (or scheduled) digital key. */
const KEY_STATUSES: readonly BookingStatus[] = ['CONFIRMED', 'CHECKED_IN'];
/** Statuses that have a tax invoice. */
const INVOICED_STATUSES: readonly BookingStatus[] = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'];

/** "My bookings" by group: key window, invoice, rebook, stay, cancel, pay and review actions. */
@Component({
  selector: 'app-bookings-tab',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    SarPipe,
    AppDatePipe,
    PluralPipe,
    EmptyStateComponent,
    IconComponent,
    StatusPillComponent,
    TabsComponent,
    LoadStateComponent,
    PagerComponent,
    BookingDetailsDialogComponent,
    CancelBookingDialogComponent,
  ],
  templateUrl: './bookings-tab.component.html',
  styles: `
    :host {
      display: block;
    }
    .booking-card {
      overflow: hidden;
    }
    .body {
      gap: 20px;
    }
    .cover {
      width: 200px;
      max-width: 100%;
      height: 140px;
      border-radius: 16px;
      object-fit: cover;
    }
    .details {
      min-width: 240px;
    }
    .top {
      align-items: flex-start;
    }
    .facts {
      gap: 10px;
    }
    .key-strip {
      background: var(--navy);
      color: #fff;
      border-radius: 12px;
      padding: 12px;
    }
    .faint {
      color: rgba(255, 255, 255, 0.6);
    }
    .actions {
      padding: 12px 20px;
      background: var(--bg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsTabComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly meApi = inject(MeApi);
  private readonly toast = inject(ToastService);
  private readonly gateway = inject(PaymentRedirectService);
  private readonly activeStay = inject(ActiveStayService);

  protected readonly groupTabs = GROUP_TABS;
  protected readonly cover = coverOf;

  protected readonly group = signal<ListGroup>('upcoming');
  protected readonly page = linkedSignal({ source: this.group, computation: () => 1 });

  protected readonly bookings = rxResource({
    params: () => ({ group: this.group(), page: this.page() }),
    stream: ({ params }) => this.bookingsApi.list(params.group, { page: params.page, limit: PAGE_SIZE }),
  });

  private readonly pendingReviews = rxResource({ stream: () => this.meApi.pendingReviews() });
  /** Reward points per booking that can still be reviewed. */
  protected readonly reviewable = computed(
    () => new Map((this.pendingReviews.hasValue() ? this.pendingReviews.value() : []).map((r) => [r.bookingId, r.rewardPoints])),
  );

  protected readonly details = signal<Booking | null>(null);
  protected readonly cancelling = signal<Booking | null>(null);
  protected readonly paying = signal<Uuid | null>(null);

  protected hasKey(b: Booking): boolean {
    return KEY_STATUSES.includes(b.status);
  }

  protected hasInvoice(b: Booking): boolean {
    return INVOICED_STATUSES.includes(b.status);
  }

  protected setGroup(group: string): void {
    this.group.set(group as ListGroup);
  }

  /** Pays a booking still on hold through the gateway. */
  protected payNow(booking: Booking): void {
    this.paying.set(booking.id);
    this.bookingsApi.pay(booking.id, 'GATEWAY').subscribe({
      next: (payment) => {
        if (!this.gateway.redirect(payment)) {
          this.paying.set(null);
          this.toast.error('errors.PAYMENT_GATEWAY_ERROR');
        }
      },
      error: (err: unknown) => {
        this.paying.set(null);
        this.toast.apiError(err);
        this.bookings.reload();
      },
    });
  }

  protected onCancelled(): void {
    this.cancelling.set(null);
    this.bookings.reload();
    this.activeStay.reload();
  }
}
