import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { ToastService } from '@core/services/toast.service';
import { SarPipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { PaymentRedirectService } from '../../services/payment-redirect.service';

/**
 * Development stand-in for the card gateway (`/test-gateway/:cartId`, backends with
 * `PAYMENT_DRIVER=test`): completes the payment remembered before the redirect as paid or
 * failed, then shows the payment result like the real gateway would.
 */
@Component({
  selector: 'app-test-gateway-page',
  imports: [RouterLink, TranslatePipe, SarPipe, EmptyStateComponent, IconComponent, LoadStateComponent],
  template: `
    <div class="container gateway">
      <div class="card card-p center">
        <span class="pill pill-amber"><app-icon name="flask-conical" size="sm" />{{ 'guest.testGateway.badge' | translate }}</span>
        <h1 class="h2 mt-12">{{ 'guest.testGateway.title' | translate }}</h1>
        <p class="xs muted mt-4 ltr">{{ cartId() }}</p>
        @if (paymentId) {
          @if (payment.hasValue()) {
            <div class="h1 mt-16">{{ payment.value().amount | sar }}</div>
            <div class="row wrap centered mt-24">
              <button type="button" class="btn btn-success" [disabled]="busy()" (click)="complete(true)">
                <app-icon name="check" size="sm" />{{ 'guest.testGateway.pay' | translate }}
              </button>
              <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="complete(false)">
                <app-icon name="x" size="sm" />{{ 'guest.testGateway.fail' | translate }}
              </button>
            </div>
          } @else {
            <app-load-state [error]="payment.error()" (retry)="payment.reload()" />
          }
        } @else {
          <app-empty-state icon="credit-card" [title]="'guest.testGateway.noPayment' | translate">
            <a class="btn btn-primary mt-16" routerLink="/account/bookings">{{ 'account.booking.done.myBookings' | translate }}</a>
          </app-empty-state>
        }
      </div>
    </div>
  `,
  styles: `
    .gateway {
      padding-top: 40px;
      padding-bottom: 40px;
      max-width: 560px;
    }
    .centered {
      justify-content: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestGatewayPage {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly cartId = input.required<string>();

  protected readonly paymentId = inject(PaymentRedirectService).pendingPaymentId();
  protected readonly busy = signal(false);
  protected readonly payment = rxResource({
    params: () => this.paymentId ?? undefined,
    stream: ({ params }) => this.bookingsApi.payment(params),
  });

  protected complete(success: boolean): void {
    const id = this.paymentId;
    if (!id) return;
    this.busy.set(true);
    this.bookingsApi.completeTestPayment(id, success).subscribe({
      next: () => void this.router.navigate(['/payments', id, 'result'], { replaceUrl: true }),
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
