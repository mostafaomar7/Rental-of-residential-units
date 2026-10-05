import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

/** Where the gateway returns the browser when it can't match the payment (`/payments/not-found`). */
@Component({
  selector: 'app-payment-not-found-page',
  imports: [RouterLink, TranslatePipe, EmptyStateComponent],
  template: `
    <div class="container">
      <div class="card card-p mt-24">
        <app-empty-state icon="credit-card" [title]="'guest.payment.notFoundTitle' | translate" [subtitle]="'guest.payment.notFoundBody' | translate">
          <div class="row wrap centered mt-16">
            <a class="btn btn-primary" routerLink="/account/bookings">{{ 'account.booking.done.myBookings' | translate }}</a>
            <a class="btn btn-ghost" routerLink="/account/wallet">{{ 'guest.payment.toWallet' | translate }}</a>
          </div>
        </app-empty-state>
      </div>
    </div>
  `,
  styles: `
    .centered {
      justify-content: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentNotFoundPage {}
