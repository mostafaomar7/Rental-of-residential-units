import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ManagedProperty } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabLink, TabLinksComponent } from '@shared/ui/tabs/tabs.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';
import { coverPhoto } from '../../services/property-utils';
import { CommercialTabComponent } from './tabs/commercial-tab.component';
import { ContentTabComponent } from './tabs/content-tab.component';
import { GovernanceTabComponent } from './tabs/governance-tab.component';
import { IdentityTabComponent } from './tabs/identity-tab.component';
import { OperationsTabComponent } from './tabs/operations-tab.component';

/** The five data layers of a property (SRS PRP-02). */
const PROFILE_TABS = [
  { id: 'identity', icon: 'id-card' },
  { id: 'content', icon: 'image' },
  { id: 'commercial', icon: 'tag' },
  { id: 'operations', icon: 'settings-2' },
  { id: 'governance', icon: 'shield-check' },
] as const;

/** `/operator/property/:id/:tab` — property profile split into its data layers. */
@Component({
  selector: 'app-property-profile-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    IconComponent,
    StatusPillComponent,
    TabLinksComponent,
    LoadingComponent,
    LoadErrorComponent,
    IdentityTabComponent,
    ContentTabComponent,
    CommercialTabComponent,
    OperationsTabComponent,
    GovernanceTabComponent,
  ],
  templateUrl: './property-profile.page.html',
  styles: `
    .cover {
      width: 120px;
      height: 90px;
      border-radius: 16px;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyProfilePage {
  private readonly api = inject(HostPropertiesApi);
  private readonly portfolio = inject(OperatorPortfolioService);

  readonly id = input.required<string>();
  readonly tab = input.required<string>();

  protected readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly cover = computed(() => (this.resource.hasValue() ? (coverPhoto(this.resource.value())?.thumbUrl ?? null) : null));

  protected readonly tabs = computed<TabLink[]>(() =>
    PROFILE_TABS.map((t) => ({ label: `operator.profile.tabs.${t.id}`, icon: t.icon, link: ['/operator/property', this.id(), t.id] })),
  );

  /** Unknown tab ids fall back to the identity layer. */
  protected readonly activeTab = computed(() => PROFILE_TABS.find((t) => t.id === this.tab())?.id ?? 'identity');

  /** A tab saved the property: show the API's version everywhere (pickers included). */
  protected onSaved(property: ManagedProperty): void {
    this.resource.set(property);
    this.portfolio.reload();
  }
}
