import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Campaign, CampaignBody, CampaignStatus } from '@api/dto';
import { AdminBusinessApi } from '@api/endpoints/admin-business.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { CAMPAIGN_CHANNELS, CampaignFormModalComponent } from '../../components/campaign-form-modal.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { CampaignPerformanceModalComponent } from './campaign-performance-modal.component';

const STATUSES: readonly CampaignStatus[] = ['ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED'];
const FILTERS: readonly TabItem[] = [{ id: 'ALL', label: 'admin.common.all' }, ...STATUSES.map((s) => ({ id: s, label: `status.campaign.${s}` }))];
const PAGE_SIZE = 20;

/** Campaigns table with create / edit, status changes and the performance view. */
@Component({
  selector: 'app-campaign-list',
  imports: [
    TranslatePipe,
    FORMAT_PIPES,
    TabsComponent,
    StatusPillComponent,
    EmptyStateComponent,
    IconComponent,
    PagerComponent,
    ResourceStateComponent,
    CampaignFormModalComponent,
    CampaignPerformanceModalComponent,
  ],
  templateUrl: './campaign-list.component.html',
  styles: `
    :host {
      display: block;
    }
    .budget-bar {
      width: 80px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignListComponent {
  private readonly api = inject(AdminBusinessApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly filters = FILTERS;
  protected readonly status = signal<string>('ALL');
  protected readonly currentPage = linkedSignal({ source: this.status, computation: () => 1 });
  /** `undefined` = closed, `null` = creating, otherwise the campaign being edited. */
  protected readonly editing = signal<Campaign | null | undefined>(undefined);
  protected readonly viewing = signal<Campaign | null>(null);
  protected readonly busy = signal(false);

  protected readonly campaigns = rxResource({
    params: () => ({ status: this.status() === 'ALL' ? undefined : (this.status() as CampaignStatus), page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.campaigns(params),
  });

  protected channelKey(channel: string): string {
    return (CAMPAIGN_CHANNELS as readonly string[]).includes(channel) ? `admin.campaigns.channels.${channel}` : channel;
  }

  protected spentPct(c: Campaign): number {
    return c.budget ? Math.min(100, (c.spend / c.budget) * 100) : 0;
  }

  protected save(body: CampaignBody): void {
    const editing = this.editing();
    const request = editing ? this.api.updateCampaign(editing.id, body) : this.api.createCampaign(body);
    this.mutate(request, editing ? 'admin.campaigns.updated' : 'admin.campaigns.created', () => this.editing.set(undefined));
  }

  protected async setStatus(campaign: Campaign, status: CampaignStatus): Promise<void> {
    if (status === 'ARCHIVED') {
      const ok = await this.confirm.ask({ title: 'admin.campaigns.archiveTitle', message: 'admin.campaigns.archiveMessage', messageParams: { name: campaign.name }, okLabel: 'admin.campaigns.archive', danger: true });
      if (!ok) return;
    }
    this.mutate(this.api.updateCampaign(campaign.id, { status }), 'admin.campaigns.updated');
  }

  private mutate(request: Observable<Campaign>, successKey: string, onDone?: () => void): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        onDone?.();
        this.toast.success(successKey);
        this.campaigns.reload();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
