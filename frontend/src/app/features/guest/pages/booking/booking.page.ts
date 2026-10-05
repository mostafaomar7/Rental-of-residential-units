import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError } from '@api/api-error';
import { Uuid } from '@api/api.types';
import { Booking, BookingConflictDetails, PaymentMethod, PromoPreview, QuotePricing } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { CampaignAttributionService } from '../../services/campaign-attribution.service';
import { PaymentRedirectService } from '../../services/payment-redirect.service';
import { WalletService } from '../../services/wallet.service';
import { staySelection } from '../../utils/stay-dates';
import { BOOKING_STEPS, BookingDraft, BookingStep, bookingPricingAsQuote } from './booking-draft';
import { BookingStepsComponent } from './components/booking-steps.component';
import { BookingSummaryComponent } from './components/booking-summary.component';
import { ConfirmationStepComponent } from './components/confirmation-step.component';
import { DatesStepComponent } from './components/dates-step.component';
import { GuestStepComponent } from './components/guest-step.component';
import { PaymentStepComponent } from './components/payment-step.component';
import { PolicyStepComponent } from './components/policy-step.component';

/**
 * Five-step booking wizard (SRS BKG-02): dates & price → guest details (+ Nafath when required) →
 * policies, which creates the booking and holds the dates → payment within the hold → confirmation.
 * Route: `/book/:propertyId?unit=&in=YYYY-MM-DD&out=YYYY-MM-DD&guests=N`. Visitors are asked to sign in.
 */
@Component({
  selector: 'app-booking-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    EmptyStateComponent,
    IconComponent,
    LoadStateComponent,
    BookingStepsComponent,
    BookingSummaryComponent,
    DatesStepComponent,
    GuestStepComponent,
    PolicyStepComponent,
    PaymentStepComponent,
    ConfirmationStepComponent,
  ],
  templateUrl: './booking.page.html',
  styles: `
    .wizard {
      padding-top: 24px;
      padding-bottom: 24px;
      max-width: 1180px;
    }
    .layout {
      gap: 24px;
      align-items: start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPage {
  readonly id = input.required<Uuid>();
  readonly unitParam = input<string | undefined>(undefined, { alias: 'unit' });
  readonly checkInParam = input<string | undefined>(undefined, { alias: 'in' });
  readonly checkOutParam = input<string | undefined>(undefined, { alias: 'out' });
  readonly guestsParam = input<string | undefined>(undefined, { alias: 'guests' });

  protected readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly discoveryApi = inject(DiscoveryApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly meApi = inject(MeApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly wallet = inject(WalletService);
  private readonly gateway = inject(PaymentRedirectService);
  private readonly campaign = inject(CampaignAttributionService);

  protected readonly totalSteps = BOOKING_STEPS.length;

  protected readonly property = rxResource({
    params: () => (this.auth.isLoggedIn() ? this.id() : undefined),
    stream: ({ params }) => this.discoveryApi.property(params),
  });

  private readonly loyalty = rxResource({
    params: () => this.auth.user()?.id,
    stream: () => this.meApi.loyalty(),
  });
  protected readonly freeCleanings = computed(() => (this.loyalty.hasValue() ? this.loyalty.value().freeCleaning.available : 0));

  // Primitive projections, so the wizard only resets when these actually change.
  private readonly userId = computed(() => this.auth.user()?.id ?? null);
  private readonly units = computed(() => (this.property.hasValue() ? this.property.value().units : []));

  protected readonly draft = linkedSignal<BookingDraft>(() => {
    // Restart for another property, and refill the guest details once the visitor signs in.
    this.id();
    this.userId();
    return this.createDraft();
  });
  protected readonly step = linkedSignal<BookingStep>(() => {
    this.id();
    this.userId();
    return 1;
  });

  protected readonly unit = computed(() => this.units().find((u) => u.id === this.draft().unitId) ?? this.units()[0] ?? null);

  private readonly quoteParams = computed(
    () => {
      const d = this.draft();
      const unitId = this.unit()?.id;
      return unitId ? { unitId, checkIn: d.checkIn, checkOut: d.checkOut, guests: d.guests, useFreeCleaning: d.useFreeCleaning } : undefined;
    },
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  protected readonly quote = rxResource({
    params: () => this.quoteParams(),
    stream: ({ params: { unitId, ...query } }) => this.discoveryApi.quote(unitId, query),
  });

  /** Applied promo code — dropped whenever the stay changes. */
  protected readonly promo = linkedSignal<unknown, PromoPreview | null>({ source: () => this.quoteParams(), computation: () => null });
  /** New price from a `PRICE_CHANGED` answer, until the stay changes again. */
  private readonly repriced = linkedSignal<unknown, QuotePricing | null>({ source: () => [this.quoteParams(), this.promo()], computation: () => null });

  /** The created booking (dates held until `holdExpiresAt`), once the policies are accepted. */
  protected readonly booking = signal<Booking | null>(null);
  protected readonly busy = signal(false);
  protected readonly promoBusy = signal(false);
  /** The API asked for Nafath before booking (`NAFATH_REQUIRED`). */
  protected readonly nafathDemanded = signal(false);

  protected readonly pricing = computed<QuotePricing | null>(() => {
    const booking = this.booking();
    if (booking) return bookingPricingAsQuote(booking.pricing);
    return this.repriced() ?? this.promo()?.pricing ?? (this.quote.hasValue() ? this.quote.value().pricing : null);
  });

  protected readonly nafathRequired = computed(
    () => !this.auth.user()?.nafathVerified && (this.nafathDemanded() || this.catalog.settings()?.compliance.nafathRequiredFor === 'BOOKING'),
  );

  constructor() {
    effect(() => {
      if (!this.auth.isLoggedIn()) untracked(() => this.requestLogin());
    });
  }

  protected requestLogin(): void {
    const queryParams = { unit: this.unitParam(), in: this.checkInParam(), out: this.checkOutParam(), guests: this.guestsParam() };
    this.auth.requestLogin(this.router.serializeUrl(this.router.createUrlTree(['/book', this.id()], { queryParams })));
  }

  protected patch(changes: Partial<BookingDraft>): void {
    this.draft.update((d) => ({ ...d, ...changes }));
  }

  protected goTo(step: BookingStep): void {
    this.step.set(step);
    this.scroller.scrollToPosition([0, 0]);
  }

  protected applyPromo(code: string): void {
    const params = this.quoteParams();
    if (!params || !code || this.promoBusy()) return;
    this.promoBusy.set(true);
    const { unitId, checkIn, checkOut, guests } = params;
    this.bookingsApi.previewPromo({ code, unitId, checkIn, checkOut, guests }).subscribe({
      next: (preview) => {
        this.promoBusy.set(false);
        if (preview.issues.length) {
          this.toast.error('account.booking.promo.notApplicable');
          return;
        }
        this.promo.set(preview);
        this.toast.success('account.booking.promo.applied', { code: preview.code });
      },
      error: (err: unknown) => {
        this.promoBusy.set(false);
        this.toast.apiError(err);
      },
    });
  }

  /** Accepting the policies creates the booking, which holds the dates until paid. */
  protected createBooking(): void {
    const d = this.draft();
    const unit = this.unit();
    const pricing = this.pricing();
    if (!unit || !pricing || !this.property.hasValue() || this.busy()) return;
    this.busy.set(true);
    this.bookingsApi
      .create({
        unitId: unit.id,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
        guests: d.guests,
        acceptPolicies: true,
        policyVersion: this.property.value().policies.version,
        expectedTotal: pricing.total,
        useFreeCleaning: d.useFreeCleaning || undefined,
        promoCode: this.promo()?.code,
        utmCampaign: this.campaign.campaign(),
        guestName: d.guestName.trim() || undefined,
        guestMobile: d.guestMobile.trim() || undefined,
        specialRequests: d.specialRequests.trim() || undefined,
      })
      .subscribe({
        next: (booking) => {
          this.busy.set(false);
          this.booking.set(booking);
          this.goTo(4);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.onCreateError(ApiError.from(err));
        },
      });
  }

  /** Drops the held booking (it expires on its own) and starts over from the dates. */
  protected restart(): void {
    this.booking.set(null);
    this.patch({ acceptPolicies: false });
    this.quote.reload();
    this.goTo(1);
  }

  protected pay(method: PaymentMethod): void {
    const booking = this.booking();
    if (!booking || this.busy()) return;
    this.busy.set(true);
    this.bookingsApi.pay(booking.id, method).subscribe({
      next: (payment) => {
        if (method === 'GATEWAY') {
          if (!this.gateway.redirect(payment)) {
            this.busy.set(false);
            this.toast.error('errors.PAYMENT_GATEWAY_ERROR');
          }
          return;
        }
        this.wallet.reload();
        this.bookingsApi.get(booking.id).subscribe({
          next: (paid) => this.confirmed(paid),
          error: () => this.confirmed(booking),
        });
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (ApiError.from(err).is('HOLD_EXPIRED')) this.booking.set({ ...booking, holdExpiresAt: new Date().toISOString() });
        this.toast.apiError(err);
      },
    });
  }

  private confirmed(booking: Booking): void {
    this.busy.set(false);
    this.booking.set(booking);
    this.goTo(5);
    this.toast.success('account.booking.done.toast', { id: booking.number });
  }

  private onCreateError(error: ApiError): void {
    if (error.is('PRICE_CHANGED')) {
      const pricing = (error.details as BookingConflictDetails | undefined)?.pricing;
      if (pricing) this.repriced.set(pricing);
      else this.quote.reload();
      this.toast.error('account.booking.errors.priceChanged');
    } else if (error.is('POLICY_CHANGED')) {
      this.patch({ acceptPolicies: false });
      this.property.reload();
      this.toast.error('account.booking.errors.policyChanged');
    } else if (error.is('DATES_UNAVAILABLE', 'HOLD_EXPIRED')) {
      this.quote.reload();
      this.goTo(1);
      this.toast.apiError(error);
    } else if (error.is('NAFATH_REQUIRED')) {
      this.nafathDemanded.set(true);
      this.goTo(2);
      this.toast.apiError(error);
    } else if (error.code.startsWith('PROMO_')) {
      this.promo.set(null);
      this.goTo(1);
      this.toast.apiError(error);
    } else {
      this.toast.apiError(error);
    }
  }

  /** Initial wizard state from the query params (validated) and the signed-in guest's profile. */
  private createDraft(): BookingDraft {
    const user = untracked(() => this.auth.user());
    return {
      ...staySelection(this.checkInParam(), this.checkOutParam(), this.guestsParam()),
      unitId: this.unitParam() ?? '',
      guestName: user?.fullName ?? '',
      guestMobile: user?.mobile ?? '',
      specialRequests: '',
      useFreeCleaning: false,
      acceptPolicies: false,
    };
  }
}
