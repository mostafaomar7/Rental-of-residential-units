import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Booking } from '@api/dto';
import { AppDatePipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { KvComponent } from '@shared/ui/kv/kv.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { QuoteBreakdownComponent } from '../../../components/quote-breakdown/quote-breakdown.component';
import { bookingPricingAsQuote } from '../../booking/booking-draft';

/** Read-only booking details: stay, price breakdown, cancellation and the accepted policy. */
@Component({
  selector: 'app-booking-details-dialog',
  imports: [RouterLink, TranslatePipe, LocalizePipe, SarPipe, AppDatePipe, PluralPipe, KvComponent, ModalComponent, StatusPillComponent, QuoteBreakdownComponent],
  template: `
    @let b = booking();
    <app-modal size="lg" [title]="'account.details.title' | translate: { id: b.number }" [subtitle]="b.property | loc" (closed)="closed.emit()">
      <div class="grid g2 details">
        <div class="soft-lg">
          <div class="bb mb-8">{{ 'account.details.stay' | translate }}</div>
          <app-kv [label]="'account.details.status' | translate"><app-status-pill domain="booking" [code]="b.status" /></app-kv>
          <app-kv [label]="'account.details.unit' | translate">{{ b.unit.name }}</app-kv>
          <app-kv [label]="'account.booking.checkIn' | translate">{{ b.checkIn | appDate: 'medium' }} • {{ b.checkInTime | appDate: 'time' }}</app-kv>
          <app-kv [label]="'account.booking.checkOut' | translate">{{ b.checkOut | appDate: 'medium' }} • {{ b.checkOutTime | appDate: 'time' }}</app-kv>
          <app-kv [label]="'account.details.nights' | translate">{{ b.nights | plural: 'common.nights' }}</app-kv>
          <app-kv [label]="'account.booking.guests' | translate">{{ b.guests | plural: 'common.guests' }}</app-kv>
          <app-kv [label]="'account.details.city' | translate">{{ b.property.city | loc }}</app-kv>
          @if (b.location?.addressLine; as address) {
            <app-kv [label]="'account.details.address' | translate">{{ address }}</app-kv>
          }
          <app-kv [label]="'account.details.createdAt' | translate">{{ b.createdAt | appDate: 'medium' }}</app-kv>
        </div>
        <div class="soft-lg">
          <div class="bb mb-8">{{ 'account.details.payment' | translate }}</div>
          <app-quote-breakdown [pricing]="pricing()" [nights]="b.nights" />
        </div>
        @if (b.cancellation; as c) {
          <div class="soft-lg">
            <div class="bb mb-8">{{ 'account.details.cancellation' | translate }}</div>
            <app-kv [label]="'account.details.cancelledAt' | translate">{{ c.cancelledAt | appDate: 'dateTime' }}</app-kv>
            <app-kv [label]="'account.details.cancelledBy' | translate">{{ 'domain.api.cancelledBy.' + c.cancelledBy | translate }}</app-kv>
            <app-kv [label]="'account.cancel.refund' | translate">
              <span class="green">{{ c.refundAmount | sar }}</span> ({{ c.refundPercent }}%)
            </app-kv>
            @if (c.reason) {
              <p class="small muted mt-4">{{ c.reason }}</p>
            }
          </div>
        }
        <div class="soft-lg">
          <div class="bb mb-8">{{ 'account.details.policies' | translate }}</div>
          <app-kv [label]="'account.details.policyAckAt' | translate">{{ b.policy.acceptedAt | appDate: 'dateTime' }}</app-kv>
          <app-kv [label]="'account.details.policyVersion' | translate"><span class="ltr">{{ b.policy.version }}</span></app-kv>
          <app-kv [label]="'account.details.cancellationPolicy' | translate">{{ b.policy.cancellation | loc }}</app-kv>
        </div>
      </div>
      @if (b.specialRequests) {
        <div class="soft-lg mt-12">
          <div class="bb mb-8">{{ 'account.details.specialRequests' | translate }}</div>
          <p class="small">{{ b.specialRequests }}</p>
        </div>
      }
      <ng-container modal-footer>
        @if (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'COMPLETED') {
          <a class="btn btn-primary" [routerLink]="['/invoice', b.id]">{{ 'account.bookings.invoice' | translate }}</a>
        }
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.close' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .details {
      gap: 12px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailsDialogComponent {
  readonly booking = input.required<Booking>();
  readonly closed = output<void>();

  protected readonly pricing = computed(() => bookingPricingAsQuote(this.booking().pricing));
}
