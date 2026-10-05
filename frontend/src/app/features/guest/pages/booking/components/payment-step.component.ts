import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Booking, PaymentMethod } from '@api/dto';
import { SarPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { WalletService } from '../../../services/wallet.service';

interface PaymentOption {
  id: PaymentMethod;
  logoClass: string;
  icon: string;
  /** Translation keys; the title receives `{balance}`. */
  title: string;
  sub: string;
}

const PAYMENT_OPTIONS: readonly PaymentOption[] = [
  { id: 'WALLET', logoClass: 'wallet-pm', icon: 'wallet', title: 'account.booking.payment.wallet', sub: 'account.booking.payment.walletSub' },
  { id: 'GATEWAY', logoClass: 'mada', icon: 'credit-card', title: 'domain.api.paymentMethod.GATEWAY', sub: 'account.booking.payment.gatewaySub' },
];

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Step 4 — pays the held booking before `holdExpiresAt` (countdown). Wallet payments are blocked
 * when the balance is short (SRS WLT-02); the gateway leaves the app and comes back to the
 * payment result page.
 */
@Component({
  selector: 'app-payment-step',
  imports: [TranslatePipe, SarPipe, IconComponent],
  template: `
    @let b = booking();
    <h2 class="h3">{{ 'account.booking.payment.title' | translate }}</h2>

    @if (expired()) {
      <div class="notice red mt-16">
        <app-icon name="timer-off" />
        <div class="grow">
          <b>{{ 'account.booking.payment.holdExpired' | translate }}</b>
          <div class="mt-8"><button type="button" class="btn btn-primary btn-xs" (click)="restart.emit()">{{ 'account.booking.payment.startAgain' | translate }}</button></div>
        </div>
      </div>
    } @else {
      @if (countdown(); as left) {
        <div class="notice amber mt-16" aria-live="polite">
          <app-icon name="hourglass" />
          <div>{{ 'account.booking.payment.holdNotice' | translate: { time: left, number: b.number } }}</div>
        </div>
      }

      <div class="stack-sm mt-16">
        @for (m of methods; track m.id) {
          <button type="button" class="radio-card" [class.on]="method() === m.id" [attr.aria-pressed]="method() === m.id" [disabled]="busy()" (click)="method.set(m.id)">
            <span class="row gap-12">
              <span class="pm-logo" [class]="m.logoClass"><app-icon [name]="m.icon" size="sm" /></span>
              <span class="start">
                <span class="b d-block">{{ m.title | translate: { balance: (balance() | sar) } }}</span>
                <span class="xs muted">{{ m.sub | translate }}</span>
              </span>
            </span>
            <span class="radio-dot"></span>
          </button>
        }
      </div>

      @if (insufficient()) {
        <div class="notice amber mt-16">
          <app-icon name="alert-triangle" />
          <div class="grow">
            <b>{{ 'account.booking.payment.lowBalance' | translate }}</b> —
            {{ 'account.booking.payment.lowBalanceHint' | translate: { amount: (shortfall() | sar) } }}
            <div class="row wrap mt-8">
              <button type="button" class="btn btn-outline btn-xs" (click)="method.set('GATEWAY')">{{ 'account.booking.payment.payByCard' | translate }}</button>
            </div>
          </div>
        </div>
      }

      <div class="row between mt-24 wrap">
        <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="restart.emit()">
          <app-icon name="arrow-right" size="sm" [mirror]="true" />{{ 'account.booking.payment.changeBooking' | translate }}
        </button>
        <button type="button" class="btn btn-gold btn-lg" [disabled]="busy() || insufficient()" [attr.aria-busy]="busy()" (click)="pay.emit(method())">
          @if (busy()) {
            <span class="spin"></span> {{ 'account.booking.payment.processing' | translate }}
          } @else {
            {{ 'account.booking.payment.confirmAndPay' | translate: { amount: (b.pricing.total | sar) } }}
          }
        </button>
      </div>
    }
  `,
  styles: `
    .start {
      text-align: start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentStepComponent {
  private readonly wallet = inject(WalletService);

  readonly booking = input.required<Booking>();
  readonly busy = input(false);

  readonly pay = output<PaymentMethod>();
  /** Drop this booking and go back to the dates. */
  readonly restart = output<void>();

  protected readonly methods = PAYMENT_OPTIONS;
  protected readonly method = signal<PaymentMethod>('WALLET');
  protected readonly balance = this.wallet.balance;

  private readonly now = signal(Date.now());
  private readonly secondsLeft = computed(() => {
    const hold = this.booking().holdExpiresAt;
    return hold ? Math.max(0, Math.floor((Date.parse(hold) - this.now()) / 1000)) : null;
  });
  protected readonly expired = computed(() => this.secondsLeft() === 0);
  /** `mm:ss` left on the hold. */
  protected readonly countdown = computed(() => {
    const s = this.secondsLeft();
    return s ? `${pad(Math.floor(s / 60))}:${pad(s % 60)}` : null;
  });

  protected readonly shortfall = computed(() => Math.max(0, this.booking().pricing.total - (this.balance() ?? 0)));
  protected readonly insufficient = computed(() => this.method() === 'WALLET' && this.balance() !== null && this.shortfall() > 0);

  constructor() {
    this.wallet.reload();
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(clock));
  }
}
