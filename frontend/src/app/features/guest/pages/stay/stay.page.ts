import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiDate, Uuid } from '@api/api.types';
import { ApiError } from '@api/api-error';
import { StayRequest, StayRequestType } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { MeApi } from '@api/endpoints/me.api';
import { CatalogService } from '@core/services/catalog.service';
import { ClipboardService } from '@core/services/clipboard.service';
import { ToastService } from '@core/services/toast.service';
import { nightsBetween, today } from '@core/utils/date.utils';
import { AppDatePipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { NafathDialogComponent } from '../../components/nafath-dialog/nafath-dialog.component';
import { ActiveStayService } from '../../services/active-stay.service';
import { mapsLink, whatsappLink } from '../../utils/property-display';
import { HouseGuideDialogComponent } from './components/house-guide-dialog.component';
import { ReportIssueDialogComponent } from './components/report-issue-dialog.component';
import { SelfCheckoutDialogComponent } from './components/self-checkout-dialog.component';
import { StayIncidentsComponent } from './components/stay-incidents.component';
import { StayKeyCardComponent } from './components/stay-key-card.component';
import { StayRequestDialogComponent } from './components/stay-request-dialog.component';

type StayDialog = 'guide' | 'issue' | 'checkout' | 'nafath';

/**
 * Current / upcoming stay (`/stay/:bookingId`): digital key, Wi-Fi, guide, early/late requests,
 * reported issues and self check-out (SRS §STY), all from `GET /bookings/:id/stay`.
 */
@Component({
  selector: 'app-stay-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    AppDatePipe,
    PluralPipe,
    SarPipe,
    IconComponent,
    StatusPillComponent,
    LoadStateComponent,
    EmptyStateComponent,
    NafathDialogComponent,
    StayKeyCardComponent,
    StayIncidentsComponent,
    HouseGuideDialogComponent,
    ReportIssueDialogComponent,
    SelfCheckoutDialogComponent,
    StayRequestDialogComponent,
  ],
  templateUrl: './stay.page.html',
  styles: `
    .state-actions {
      justify-content: center;
    }
    .stay {
      padding-top: 24px;
      padding-bottom: 24px;
    }
    .stay-hero {
      padding: 28px;
    }
    .soft-white {
      color: rgba(255, 255, 255, 0.7);
    }
    .layout {
      gap: 24px;
      align-items: start;
    }
    .req {
      text-align: start;
    }
    .request {
      padding: 10px 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StayPage {
  readonly id = input.required<Uuid>();

  private readonly bookingsApi = inject(BookingsApi);
  private readonly meApi = inject(MeApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly activeStay = inject(ActiveStayService);
  protected readonly clipboard = inject(ClipboardService);

  protected readonly dialog = signal<StayDialog | null>(null);
  protected readonly requestType = signal<StayRequestType | null>(null);
  protected readonly cancellingRequest = signal<Uuid | null>(null);

  protected readonly stay = rxResource({ params: () => this.id(), stream: ({ params }) => this.bookingsApi.stay(params) });
  /** Upcoming booking: the API refuses the stay screen before arrival day (`STAY_NOT_STARTED`). */
  protected readonly notStarted = computed(() => {
    const error = this.stay.error();
    if (!error) return null;
    const apiError = ApiError.from(error);
    return apiError.is('STAY_NOT_STARTED') ? (apiError.details as { checkIn: ApiDate; daysUntil: number }) : null;
  });
  /** Finished or cancelled booking: there is no stay screen any more (`STAY_NOT_ACTIVE`). */
  protected readonly notActive = computed(() => {
    const error = this.stay.error();
    return !!error && ApiError.from(error).is('STAY_NOT_ACTIVE');
  });
  protected readonly requests = rxResource({ params: () => this.id(), stream: ({ params }) => this.bookingsApi.stayRequests(params) });
  protected readonly incidents = rxResource({ params: () => this.id(), stream: ({ params }) => this.bookingsApi.incidents(params) });
  private readonly pendingReviews = rxResource({ stream: () => this.meApi.pendingReviews() });

  protected readonly changeFees = computed(() => this.catalog.settings()?.stay_changes ?? null);
  protected readonly nightsLeft = computed(() => (this.stay.hasValue() ? Math.max(0, nightsBetween(today(), this.stay.value().checkOut.date)) : 0));
  protected readonly reviewPoints = computed(() =>
    this.pendingReviews.hasValue() ? (this.pendingReviews.value().find((r) => r.bookingId === this.id())?.rewardPoints ?? null) : null,
  );
  protected readonly whatsappUrl = computed(() =>
    whatsappLink(this.stay.hasValue() ? this.stay.value().support.whatsapp : null) ?? whatsappLink(this.catalog.settings()?.support_whatsapp),
  );
  protected readonly mapUrl = computed(() => {
    const location = this.stay.hasValue() ? this.stay.value().property.location : null;
    return mapsLink(location?.lat, location?.lng);
  });

  /** Early check-in can only be requested before the arrival day. */
  protected openRequest(type: StayRequestType, blocked: boolean): void {
    if (blocked) {
      this.toast.error('account.stay.earlyOnlyBefore');
      return;
    }
    this.requestType.set(type);
  }

  protected onRequested(request: StayRequest): void {
    this.requestType.set(null);
    this.requests.update((list) => [request, ...(list ?? [])]);
  }

  protected cancelRequest(request: StayRequest): void {
    this.cancellingRequest.set(request.id);
    this.bookingsApi.cancelStayRequest(this.id(), request.id).subscribe({
      next: (updated) => {
        this.cancellingRequest.set(null);
        this.requests.update((list) => list?.map((r) => (r.id === updated.id ? updated : r)));
        this.toast.show('account.stay.request.cancelled');
      },
      error: (err: unknown) => {
        this.cancellingRequest.set(null);
        this.toast.apiError(err);
      },
    });
  }

  protected onReported(): void {
    this.incidents.reload();
  }

  protected onIdentityVerified(): void {
    this.dialog.set(null);
    this.toast.success('account.nafath.done');
    this.stay.reload();
  }

  protected onCheckedOut(): void {
    this.dialog.set(null);
    this.activeStay.reload();
    void this.router.navigate(['/review', this.id()]);
  }
}
