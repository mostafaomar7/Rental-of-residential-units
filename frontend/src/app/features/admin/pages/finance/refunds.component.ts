import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { Refund, RefundStatus } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

const STATUSES: readonly RefundStatus[] = ['FAILED', 'PENDING', 'SUCCEEDED'];
const PAGE_SIZE = 20;

/** Refunds — failed ones first, with a manual retry. */
@Component({
  selector: 'app-refunds',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, StatusPillComponent, EmptyStateComponent, PagerComponent, ResourceStateComponent],
  template: `
    <div class="card card-p">
      <div class="row wrap mb-16">
        <select class="select filter" [attr.aria-label]="'admin.finance.refunds.status' | translate" [(ngModel)]="status">
          <option value="">{{ 'admin.common.all' | translate }}</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ 'status.refund.' + s | translate }}</option>
          }
        </select>
      </div>

      <app-resource-state [resource]="refunds" />
      @if (refunds.hasValue()) {
        @let page = refunds.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.finance.created' | translate }}</th>
                  <th>{{ 'admin.finance.amount' | translate }}</th>
                  <th>{{ 'admin.finance.refunds.destination' | translate }}</th>
                  <th>{{ 'admin.finance.refunds.reason' | translate }}</th>
                  <th>{{ 'admin.finance.refunds.status' | translate }}</th>
                  <th>{{ 'admin.finance.refunds.attempts' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (r of page.items; track r.id) {
                  <tr>
                    <td class="small nowrap">{{ r.createdAt | appDate: 'dateTime' }}</td>
                    <td class="b nowrap">{{ r.amount | sar }}</td>
                    <td class="small">{{ destinationKey(r) | translate }}</td>
                    <td class="small" dir="auto">{{ r.reason || ('common.none' | translate) }}</td>
                    <td>
                      <app-status-pill domain="refund" [code]="r.status" />
                      @if (r.failureReason) {
                        <div class="xs red mt-4">{{ r.failureReason }}</div>
                      }
                    </td>
                    <td class="small">{{ r.attempts }}</td>
                    <td>
                      @if (r.status === 'FAILED') {
                        <button type="button" class="btn btn-primary btn-xs" [disabled]="retrying() === r.id" (click)="retry(r)">{{ 'admin.finance.refunds.retry' | translate }}</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="check-check" [title]="'admin.finance.refunds.empty' | translate" />
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
export class RefundsComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);
  private readonly queues = inject(AdminQueuesService);

  protected readonly statuses = STATUSES;
  protected readonly status = signal<RefundStatus | ''>('FAILED');
  protected readonly currentPage = linkedSignal({ source: this.status, computation: () => 1 });
  protected readonly retrying = signal<Uuid | null>(null);

  protected readonly refunds = rxResource({
    params: () => ({ status: this.status() || undefined, page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.refunds(params),
  });

  /** Known destinations are labelled; anything else is shown as sent. */
  protected destinationKey(refund: Refund): string {
    return refund.destination === 'ORIGINAL' || refund.destination === 'WALLET' ? `admin.finance.refunds.destinations.${refund.destination}` : refund.destination;
  }

  protected retry(refund: Refund): void {
    this.retrying.set(refund.id);
    this.api.retryRefund(refund.id).subscribe({
      next: (updated) => {
        this.retrying.set(null);
        if (updated.status === 'FAILED') this.toast.error('admin.finance.refunds.stillFailing');
        else this.toast.success('admin.finance.refunds.retried');
        this.refunds.reload();
        this.queues.refresh();
      },
      error: (err) => {
        this.retrying.set(null);
        this.toast.apiError(err);
      },
    });
  }
}
