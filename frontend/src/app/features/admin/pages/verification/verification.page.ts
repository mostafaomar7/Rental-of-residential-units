import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { BankAccountsComponent } from './bank-accounts.component';
import { PropertyQueueComponent } from './property-queue.component';

type VerificationTab = 'properties' | 'bank';

/** `/admin/verification?tab=` — property review before publishing, and owner payout-account verification. */
@Component({
  selector: 'app-verification-page',
  imports: [TranslatePipe, PageHeaderComponent, TabsComponent, PropertyQueueComponent, BankAccountsComponent],
  template: `
    <app-page-header [title]="'admin.verification.title' | translate" [subtitle]="'admin.verification.subtitle' | translate" />
    <div class="mb-16"><app-tabs variant="tabs-line" [items]="tabs()" [(active)]="active" /></div>

    @if (active() === 'bank') {
      <app-bank-accounts />
    } @else {
      <app-property-queue />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationPage {
  private readonly queues = inject(AdminQueuesService);

  /** Initial tab from the URL (`?tab=bank` from the overview tile). */
  readonly tab = input<string>();

  protected readonly active = linkedSignal<string>(() => (this.tab() === 'bank' ? 'bank' : 'properties'));

  protected readonly tabs = computed<TabItem<VerificationTab>[]>(() => {
    const q = this.queues.counts();
    return [
      { id: 'properties', label: 'admin.verification.tabProperties', icon: 'building-2', count: q.properties ?? undefined },
      { id: 'bank', label: 'admin.verification.tabBank', icon: 'landmark', count: q.bankAccounts ?? undefined },
    ];
  });
}
