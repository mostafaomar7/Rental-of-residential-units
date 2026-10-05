import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, switchMap, take, takeWhile, timer } from 'rxjs';
import { Uuid } from '@api/api.types';
import { Payment } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { SarPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { ActiveStayService } from '../../services/active-stay.service';
import { PaymentRedirectService } from '../../services/payment-redirect.service';
import { WalletService } from '../../services/wallet.service';

const POLL_MS = 2000;
/** 30 polls × 2 s — then the result is shown as still processing. */
const MAX_POLLS = 30;

type Outcome = 'paid' | 'failed' | 'pending';

/**
 * Where the payment gateway returns the browser (`/payments/:paymentId/result`). The payment is
 * polled every 2 s for up to a minute until it settles, then the outcome links to the booking or
 * the wallet.
 */
@Component({
  selector: 'app-payment-result-page',
  imports: [RouterLink, TranslatePipe, SarPipe, IconComponent, StatusPillComponent, LoadStateComponent],
  template: `
    <div class="container result">
      <div class="card card-p center">
        @if (payment(); as p) {
          @switch (outcome()) {
            @case ('paid') {
              <div class="li-ic green big-ic"><app-icon name="check-circle-2" size="xl" /></div>
              <h1 class="h2 mt-12">{{ 'guest.payment.paidTitle.' + p.purpose | translate }}</h1>
            }
            @case ('failed') {
              <div class="li-ic red big-ic"><app-icon name="x-circle" size="xl" /></div>
              <h1 class="h2 mt-12">{{ 'guest.payment.failedTitle' | translate }}</h1>
              <p class="small muted mt-4">{{ 'guest.payment.failedBody' | translate }}</p>
            }
            @default {
              <div class="li-ic gold big-ic"><span class="spin dark"></span></div>
              <h1 class="h2 mt-12">{{ 'guest.payment.pendingTitle' | translate }}</h1>
              <p class="small muted mt-4">{{ (polling() ? 'guest.payment.pendingBody' : 'guest.payment.stillPending') | translate }}</p>
            }
          }
          <div class="row centered mt-16">
            <b class="lg">{{ p.amount | sar }}</b>
            <app-status-pill domain="payment" [code]="p.status" />
          </div>
          @if (p.cardLast4) {
            <p class="xs muted mt-4 ltr">{{ p.cardScheme }} •••• {{ p.cardLast4 }}</p>
          }
          <div class="row wrap centered mt-24">
            @if (p.purpose === 'BOOKING') {
              @if (outcome() === 'paid' && p.bookingId) {
                <a class="btn btn-primary" [routerLink]="['/stay', p.bookingId]">{{ 'guest.payment.stayPage' | translate }}</a>
                <a class="btn btn-ghost" [routerLink]="['/invoice', p.bookingId]">{{ 'account.booking.done.invoice' | translate }}</a>
              }
              <a class="btn btn-ghost" routerLink="/account/bookings">{{ 'account.booking.done.myBookings' | translate }}</a>
            } @else {
              <a class="btn btn-primary" routerLink="/account/wallet">{{ 'guest.payment.toWallet' | translate }}</a>
            }
            @if (outcome() === 'pending' && !polling()) {
              <button type="button" class="btn btn-ghost" (click)="poll()">{{ 'guest.payment.checkAgain' | translate }}</button>
            }
          </div>
        } @else if (error()) {
          <app-load-state [error]="error()" (retry)="poll()" />
        } @else {
          <app-load-state />
        }
      </div>
    </div>
  `,
  styles: `
    .result {
      padding-top: 40px;
      padding-bottom: 40px;
      max-width: 640px;
    }
    .big-ic {
      width: 72px;
      height: 72px;
      margin: 0 auto;
    }
    .centered {
      justify-content: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentResultPage {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly gateway = inject(PaymentRedirectService);
  private readonly wallet = inject(WalletService);
  private readonly activeStay = inject(ActiveStayService);

  readonly paymentId = input.required<Uuid>();

  protected readonly payment = signal<Payment | null>(null);
  protected readonly error = signal<unknown>(undefined);
  protected readonly polling = signal(false);
  protected readonly outcome = computed<Outcome>(() => {
    const status = this.payment()?.status;
    if (status === 'PAID') return 'paid';
    if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
    return 'pending';
  });

  private subscription?: Subscription;

  constructor() {
    effect(() => {
      this.paymentId();
      untracked(() => this.poll());
    });
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  protected poll(): void {
    this.subscription?.unsubscribe();
    this.error.set(undefined);
    this.polling.set(true);
    this.subscription = timer(0, POLL_MS)
      .pipe(
        take(MAX_POLLS),
        switchMap(() => this.bookingsApi.payment(this.paymentId())),
        takeWhile((p) => p.status === 'PENDING', true),
      )
      .subscribe({
        next: (payment) => this.payment.set(payment),
        error: (err: unknown) => {
          this.polling.set(false);
          this.error.set(err);
        },
        complete: () => this.settled(),
      });
  }

  private settled(): void {
    this.polling.set(false);
    if (this.outcome() === 'pending') return;
    this.gateway.clear();
    this.wallet.reload();
    this.activeStay.reload();
  }
}
