import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { NotificationDelivery } from '@api/dto';
import { AdminConfigApi } from '@api/endpoints/admin-config.api';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';

type DeliveryStatus = NotificationDelivery['status'];
type DeliveryChannel = NotificationDelivery['channel'];

const STATUSES: readonly DeliveryStatus[] = ['FAILED', 'PENDING', 'SENDING', 'SENT'];
const CHANNELS: readonly DeliveryChannel[] = ['SMS', 'WHATSAPP', 'EMAIL'];
const PAGE_SIZE = 20;

/** Outbound SMS / WhatsApp / e-mail deliveries — failed ones by default, with a manual retry. */
@Component({
  selector: 'app-deliveries',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, StatusPillComponent, EmptyStateComponent, PagerComponent, ResourceStateComponent],
  template: `
    <div class="card card-p">
      <div class="row wrap mb-16">
        <select class="select filter" [attr.aria-label]="'admin.deliveries.status' | translate" [(ngModel)]="status">
          <option value="">{{ 'admin.common.all' | translate }}</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ 'status.delivery.' + s | translate }}</option>
          }
        </select>
        <select class="select filter" [attr.aria-label]="'admin.deliveries.channel' | translate" [(ngModel)]="channel">
          <option value="">{{ 'admin.deliveries.allChannels' | translate }}</option>
          @for (c of channels; track c) {
            <option [value]="c">{{ 'admin.templates.channels.' + c | translate }}</option>
          }
        </select>
      </div>

      <app-resource-state [resource]="deliveries" />
      @if (deliveries.hasValue()) {
        @let page = deliveries.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.deliveries.created' | translate }}</th>
                  <th>{{ 'admin.deliveries.template' | translate }}</th>
                  <th>{{ 'admin.deliveries.channel' | translate }}</th>
                  <th>{{ 'admin.deliveries.user' | translate }}</th>
                  <th>{{ 'admin.deliveries.status' | translate }}</th>
                  <th>{{ 'admin.deliveries.attempts' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (d of page.items; track d.id) {
                  <tr>
                    <td class="small nowrap">{{ d.createdAt | appDate: 'dateTime' }}</td>
                    <td><span class="kbd">{{ d.template }}</span></td>
                    <td class="small">{{ 'admin.templates.channels.' + d.channel | translate }}</td>
                    <td class="xs muted ltr">{{ d.userId }}</td>
                    <td>
                      <app-status-pill domain="delivery" [code]="d.status" />
                      @if (d.lastError) {
                        <div class="xs red mt-4 truncate err" [attr.title]="d.lastError">{{ d.lastError }}</div>
                      }
                    </td>
                    <td class="small">{{ d.attempts }}</td>
                    <td>
                      @if (d.status === 'FAILED') {
                        <button type="button" class="btn btn-primary btn-xs" [disabled]="retrying() === d.id" (click)="retry(d)">{{ 'admin.deliveries.retry' | translate }}</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="check-check" [title]="'admin.deliveries.empty' | translate" />
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
    .err {
      max-width: 240px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveriesComponent {
  private readonly api = inject(AdminConfigApi);
  private readonly toast = inject(ToastService);

  protected readonly statuses = STATUSES;
  protected readonly channels = CHANNELS;
  protected readonly status = signal<DeliveryStatus | ''>('FAILED');
  protected readonly channel = signal<DeliveryChannel | ''>('');
  protected readonly currentPage = linkedSignal({ source: () => [this.status(), this.channel()], computation: () => 1 });
  protected readonly retrying = signal<Uuid | null>(null);

  protected readonly deliveries = rxResource({
    params: () => ({ status: this.status() || undefined, channel: this.channel() || undefined, page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.deliveries(params),
  });

  protected retry(delivery: NotificationDelivery): void {
    this.retrying.set(delivery.id);
    this.api.retryDelivery(delivery.id).subscribe({
      next: () => {
        this.retrying.set(null);
        this.toast.success('admin.deliveries.retried');
        this.deliveries.reload();
      },
      error: (err) => {
        this.retrying.set(null);
        this.toast.apiError(err);
      },
    });
  }
}
