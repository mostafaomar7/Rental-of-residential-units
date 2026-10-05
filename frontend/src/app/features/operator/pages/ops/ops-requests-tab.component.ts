import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StayRequest, StayRequestStatus } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { PagerComponent } from '../../components/pager.component';
import { Mutation } from '../../services/mutation';

type RequestFilter = StayRequestStatus | 'ALL';
const PAGE_SIZE = 20;

/** Early check-in / late check-out requests from guests: approve, or reject with a reason. */
@Component({
  selector: 'app-ops-requests-tab',
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    AppDatePipe,
    SarPipe,
    EmptyStateComponent,
    FieldComponent,
    ModalComponent,
    StatusPillComponent,
    TabsComponent,
    LoadingComponent,
    LoadErrorComponent,
    PagerComponent,
  ],
  template: `
    <div class="card card-p">
      <div class="card-h">
        <h3>{{ 'operations.requests.title' | translate }}</h3>
        <app-tabs [items]="filters" [active]="filter()" (activeChange)="setFilter($event)" />
      </div>

      @if (resource.isLoading()) {
        <app-loading />
      } @else if (resource.error()) {
        <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
      } @else if (resource.hasValue() && resource.value().items.length) {
        @let list = resource.value();
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>{{ 'operations.requests.cols.booking' | translate }}</th>
                <th>{{ 'operations.requests.cols.type' | translate }}</th>
                <th>{{ 'operations.requests.cols.time' | translate }}</th>
                <th>{{ 'operations.requests.cols.fee' | translate }}</th>
                <th>{{ 'operations.requests.cols.status' | translate }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of list.items; track r.id) {
                <tr>
                  <td>
                    <a class="b ltr" [routerLink]="['/operator/booking', r.bookingId]">{{ r.bookingNumber }}</a>
                    <div class="xs muted">{{ r.createdAt | appDate: 'dateTime' }}</div>
                  </td>
                  <td>{{ 'domain.api.stayRequestType.' + r.type | translate }}</td>
                  <td class="b">{{ r.requestedTime | appDate: 'time' }}</td>
                  <td class="nowrap">{{ r.fee | sar }}</td>
                  <td>
                    <app-status-pill domain="stayRequest" [code]="r.status" />
                    @if (r.reason) {
                      <div class="xs muted">{{ r.reason }}</div>
                    }
                  </td>
                  <td class="nowrap">
                    @if (r.status === 'PENDING') {
                      <button type="button" class="btn btn-success btn-xs" [disabled]="deciding.busy()" (click)="approve(r)">{{ 'operations.requests.approve' | translate }}</button>
                      <button type="button" class="btn btn-danger btn-xs" [disabled]="deciding.busy()" (click)="rejecting.set(r)">{{ 'operations.requests.reject' | translate }}</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [meta]="list.meta" (pageChange)="page.set($event)" />
      } @else {
        <app-empty-state icon="clock" [title]="'operations.requests.empty' | translate" />
      }
    </div>

    @if (rejecting(); as r) {
      <app-modal size="sm" [title]="'operations.requests.rejectTitle' | translate" [subtitle]="r.bookingNumber" (closed)="rejecting.set(null)">
        <app-field [label]="'operations.requests.reason' | translate" for="sr-reason">
          <textarea id="sr-reason" class="textarea" [(ngModel)]="reason"></textarea>
        </app-field>
        <ng-container modal-footer>
          <button type="button" class="btn btn-danger" [disabled]="deciding.busy()" (click)="reject(r)">{{ 'operations.requests.reject' | translate }}</button>
          <button type="button" class="btn btn-ghost" (click)="rejecting.set(null)">{{ 'common.cancel' | translate }}</button>
        </ng-container>
      </app-modal>
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsRequestsTabComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly filters: TabItem<RequestFilter>[] = [
    { id: 'PENDING', label: 'status.stayRequest.PENDING' },
    { id: 'APPROVED', label: 'status.stayRequest.APPROVED' },
    { id: 'REJECTED', label: 'status.stayRequest.REJECTED' },
    { id: 'ALL', label: 'common.all' },
  ];
  /** Bound to `app-tabs` (string ids); always one of {@link RequestFilter}. */
  protected readonly filter = signal<string>('PENDING');
  protected readonly page = signal(1);
  protected readonly rejecting = signal<StayRequest | null>(null);
  protected readonly reason = signal('');
  protected readonly deciding = new Mutation();

  protected readonly resource = rxResource({
    params: () => {
      const filter = this.filter() as RequestFilter;
      return { status: filter === 'ALL' ? undefined : filter, page: this.page(), limit: PAGE_SIZE };
    },
    stream: ({ params }) => this.api.stayRequests(params),
  });

  protected setFilter(filter: string): void {
    this.filter.set(filter);
    this.page.set(1);
  }

  protected async approve(request: StayRequest): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'operations.requests.approveTitle',
      message: 'operations.requests.approveMessage',
      messageParams: { booking: request.bookingNumber },
      okLabel: 'operations.requests.approve',
    });
    if (!ok) return;
    this.deciding.run(this.api.decideStayRequest(request.id, true), () => {
      this.toast.success('operations.requests.toast.approved');
      this.resource.reload();
    });
  }

  protected reject(request: StayRequest): void {
    this.deciding.run(this.api.decideStayRequest(request.id, false, this.reason().trim() || undefined), () => {
      this.toast.show('operations.requests.toast.rejected');
      this.rejecting.set(null);
      this.reason.set('');
      this.resource.reload();
    });
  }
}
