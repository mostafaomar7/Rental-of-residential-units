import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PaymentPurpose, PaymentStatus } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

const STATUSES: readonly PaymentStatus[] = ['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
const PURPOSES: readonly PaymentPurpose[] = ['BOOKING', 'WALLET_TOPUP'];
const PAGE_SIZE = 20;

/** Every payment (bookings and wallet top-ups), filterable by status and purpose. */
@Component({
  selector: 'app-payments',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, StatusPillComponent, EmptyStateComponent, PagerComponent, ResourceStateComponent],
  template: `
    <div class="card card-p">
      <div class="row wrap mb-16">
        <select class="select filter" [attr.aria-label]="'admin.finance.payments.status' | translate" [(ngModel)]="status">
          <option value="">{{ 'admin.common.all' | translate }}</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ 'status.payment.' + s | translate }}</option>
          }
        </select>
        <select class="select filter" [attr.aria-label]="'admin.finance.payments.purpose' | translate" [(ngModel)]="purpose">
          <option value="">{{ 'admin.finance.payments.allPurposes' | translate }}</option>
          @for (p of purposes; track p) {
            <option [value]="p">{{ 'admin.finance.payments.purposes.' + p | translate }}</option>
          }
        </select>
      </div>

      <app-resource-state [resource]="payments" />
      @if (payments.hasValue()) {
        @let page = payments.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.finance.created' | translate }}</th>
                  <th>{{ 'admin.finance.amount' | translate }}</th>
                  <th>{{ 'admin.finance.payments.purpose' | translate }}</th>
                  <th>{{ 'admin.finance.payments.method' | translate }}</th>
                  <th>{{ 'admin.finance.payments.status' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (p of page.items; track p.id) {
                  <tr>
                    <td class="small nowrap">
                      {{ p.createdAt | appDate: 'dateTime' }}
                      <div class="xs muted ltr">{{ p.id }}</div>
                    </td>
                    <td class="nowrap">
                      <div class="b">{{ p.amount | sar }}</div>
                      @if (p.refundedAmount) {
                        <div class="xs muted">{{ 'admin.finance.payments.refunded' | translate: { amount: (p.refundedAmount | sar) } }}</div>
                      }
                    </td>
                    <td class="small">{{ 'admin.finance.payments.purposes.' + p.purpose | translate }}</td>
                    <td class="small">
                      {{ 'domain.api.paymentMethod.' + p.method | translate }}
                      @if (p.cardLast4) {
                        <div class="xs muted ltr">{{ p.cardScheme }} •••• {{ p.cardLast4 }}</div>
                      }
                    </td>
                    <td>
                      <app-status-pill domain="payment" [code]="p.status" />
                      @if (p.failureReason) {
                        <div class="xs red mt-4">{{ p.failureReason }}</div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="credit-card" [title]="'admin.finance.payments.empty' | translate" />
        }
        <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .filter {
      width: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsComponent {
  private readonly api = inject(AdminBusinessApi);

  protected readonly statuses = STATUSES;
  protected readonly purposes = PURPOSES;
  protected readonly status = signal<PaymentStatus | ''>('');
  protected readonly purpose = signal<PaymentPurpose | ''>('');
  protected readonly currentPage = linkedSignal({ source: () => [this.status(), this.purpose()], computation: () => 1 });

  protected readonly payments = rxResource({
    params: () => ({ status: this.status() || undefined, purpose: this.purpose() || undefined, page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.payments(params),
  });
}
