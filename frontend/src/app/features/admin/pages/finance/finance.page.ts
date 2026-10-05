import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { PaymentsComponent } from './payments.component';
import { PayoutsComponent } from './payouts.component';
import { RefundsComponent } from './refunds.component';
import { OwnerFilter, StatementsComponent } from './statements.component';

type FinanceTab = 'payouts' | 'statements' | 'refunds' | 'payments';
const TAB_IDS: readonly FinanceTab[] = ['payouts', 'statements', 'refunds', 'payments'];

/** `/admin/finance?tab=` — owner payouts and statements, refunds and payments. */
@Component({
  selector: 'app-finance-page',
  imports: [TranslatePipe, PageHeaderComponent, TabsComponent, PayoutsComponent, StatementsComponent, RefundsComponent, PaymentsComponent],
  template: `
    <app-page-header [title]="'admin.finance.title' | translate" [subtitle]="'admin.finance.subtitle' | translate" />
    <div class="mb-16"><app-tabs variant="tabs-line" [items]="tabs()" [(active)]="active" /></div>

    @switch (active()) {
      @case ('statements') {
        <app-statements [(owner)]="owner" />
      }
      @case ('refunds') {
        <app-refunds />
      }
      @case ('payments') {
        <app-payments />
      }
      @default {
        <app-payouts (showStatements)="openStatements($event)" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePage {
  private readonly queues = inject(AdminQueuesService);

  /** Initial tab from the URL (`?tab=refunds` from the overview tile). */
  readonly tab = input<string>();

  protected readonly active = linkedSignal<string>(() => {
    const tab = this.tab() as FinanceTab;
    return TAB_IDS.includes(tab) ? tab : 'payouts';
  });
  protected readonly owner = signal<OwnerFilter | null>(null);

  protected readonly tabs = computed<TabItem<FinanceTab>[]>(() => [
    { id: 'payouts', label: 'admin.finance.tabs.payouts', icon: 'wallet' },
    { id: 'statements', label: 'admin.finance.tabs.statements', icon: 'file-text' },
    { id: 'refunds', label: 'admin.finance.tabs.refunds', icon: 'rotate-ccw', count: this.queues.counts().failedRefunds || undefined },
    { id: 'payments', label: 'admin.finance.tabs.payments', icon: 'credit-card' },
  ]);

  protected openStatements(owner: OwnerFilter): void {
    this.owner.set(owner);
    this.active.set('statements');
  }
}
