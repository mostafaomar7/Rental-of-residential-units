import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { CampaignListComponent } from './campaign-list.component';
import { PromoCodesComponent } from './promo-codes.component';

const TABS: readonly TabItem[] = [
  { id: 'campaigns', label: 'admin.campaigns.tabCampaigns', icon: 'megaphone' },
  { id: 'promo', label: 'admin.campaigns.tabPromo', icon: 'badge-percent' },
];

/** `/admin/campaigns` — platform campaigns and their booking impact, and promo codes (SRS §CMP). */
@Component({
  selector: 'app-admin-campaigns-page',
  imports: [TranslatePipe, PageHeaderComponent, TabsComponent, CampaignListComponent, PromoCodesComponent],
  template: `
    <app-page-header [title]="'admin.campaigns.title' | translate" [subtitle]="'admin.campaigns.subtitle' | translate" />
    <div class="mb-16"><app-tabs variant="tabs-line" [items]="tabs" [(active)]="tab" /></div>

    @if (tab() === 'promo') {
      <app-promo-codes />
    } @else {
      <app-campaign-list />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCampaignsPage {
  protected readonly tabs = TABS;
  protected readonly tab = signal<string>('campaigns');
}
