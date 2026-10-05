import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { BankAccountStatus } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { BankAccountModalComponent } from './bank-account-modal.component';

type StatusFilter = BankAccountStatus | 'ALL';

const FILTERS: readonly TabItem<StatusFilter>[] = [
  { id: 'PENDING', label: 'status.bankAccount.PENDING' },
  { id: 'VERIFIED', label: 'status.bankAccount.VERIFIED' },
  { id: 'REJECTED', label: 'status.bankAccount.REJECTED' },
  { id: 'ALL', label: 'admin.common.all' },
];

const PAGE_SIZE = 20;

/** Owner payout accounts awaiting verification (IBAN masked until opened). */
@Component({
  selector: 'app-bank-accounts',
  imports: [TranslatePipe, FORMAT_PIPES, TabsComponent, StatusPillComponent, EmptyStateComponent, PagerComponent, ResourceStateComponent, BankAccountModalComponent],
  template: `
    <div class="mb-16"><app-tabs [items]="filters" [(active)]="status" /></div>

    <div class="card card-p">
      <app-resource-state [resource]="accounts" />
      @if (accounts.hasValue()) {
        @let page = accounts.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.bank.cols.owner' | translate }}</th>
                  <th>{{ 'admin.bank.cols.bank' | translate }}</th>
                  <th>{{ 'admin.bank.cols.iban' | translate }}</th>
                  <th>{{ 'admin.bank.cols.status' | translate }}</th>
                  <th>{{ 'admin.bank.cols.updated' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (a of page.items; track a.ownerId) {
                  <tr>
                    <td>
                      <div class="b">{{ a.owner?.fullName ?? a.accountName }}</div>
                      <div class="xs muted ltr">{{ a.owner?.mobile }}</div>
                    </td>
                    <td class="small">
                      {{ a.bankName }}
                      <div class="xs muted" dir="auto">{{ a.accountName }}</div>
                    </td>
                    <td><span class="kbd">{{ a.iban }}</span></td>
                    <td><app-status-pill domain="bankAccount" [code]="a.status" /></td>
                    <td class="small nowrap">{{ a.updatedAt | appDate: 'dateTime' }}</td>
                    <td>
                      <button type="button" class="btn btn-primary btn-xs" (click)="reviewing.set(a.ownerId)">{{ 'admin.bank.open' | translate }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="landmark" [title]="'admin.bank.empty' | translate" />
        }
        <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
      }
    </div>

    @if (reviewing(); as ownerId) {
      <app-bank-account-modal [ownerId]="ownerId" (changed)="onChanged()" (closed)="reviewing.set(null)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankAccountsComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly queues = inject(AdminQueuesService);

  protected readonly filters = FILTERS;
  protected readonly status = signal<string>('PENDING');
  protected readonly currentPage = linkedSignal({ source: this.status, computation: () => 1 });
  protected readonly reviewing = signal<Uuid | null>(null);

  protected readonly accounts = rxResource({
    params: () => ({
      status: this.status() === 'ALL' ? undefined : (this.status() as BankAccountStatus),
      page: this.currentPage(),
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.api.bankAccounts(params),
  });

  protected onChanged(): void {
    this.accounts.reload();
    this.queues.refresh();
  }
}
