import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Incident, IncidentStatus } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ToastService } from '@core/services/toast.service';
import { AuthSrcDirective } from '@shared/directives/auth-src.directive';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { PagerComponent } from '../../components/pager.component';
import { Mutation } from '../../services/mutation';
import { OperatorBadgesService } from '../../services/operator-badges.service';
import { ResolveIncidentModalComponent } from './resolve-incident-modal.component';

type IncidentFilter = IncidentStatus | 'ALL';
const PAGE_SIZE = 20;
/** Evidence thumbnails shown per row. */
const ROW_PHOTOS = 3;

/** Incidents reported by guests and staff, with status changes and resolution. */
@Component({
  selector: 'app-ops-incidents-tab',
  imports: [
    RouterLink,
    TranslatePipe,
    AuthSrcDirective,
    AppDatePipe,
    EmptyStateComponent,
    StatusPillComponent,
    TabsComponent,
    LoadingComponent,
    LoadErrorComponent,
    PagerComponent,
    ResolveIncidentModalComponent,
  ],
  templateUrl: './ops-incidents-tab.component.html',
  styles: `
    :host {
      display: block;
    }
    .desc {
      max-width: 280px;
    }
    .evidence {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsIncidentsTabComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly badges = inject(OperatorBadgesService);

  protected readonly rowPhotos = ROW_PHOTOS;
  protected readonly filters: TabItem<IncidentFilter>[] = [
    { id: 'OPEN', label: 'status.incident.OPEN' },
    { id: 'IN_PROGRESS', label: 'status.incident.IN_PROGRESS' },
    { id: 'RESOLVED', label: 'status.incident.RESOLVED' },
    { id: 'ALL', label: 'common.all' },
  ];
  /** Bound to `app-tabs` (string ids); always one of {@link IncidentFilter}. */
  protected readonly filter = signal<string>('OPEN');
  protected readonly page = signal(1);
  protected readonly resolving = signal<Incident | null>(null);
  protected readonly updating = new Mutation();

  protected readonly resource = rxResource({
    params: () => {
      const filter = this.filter() as IncidentFilter;
      return { status: filter === 'ALL' ? undefined : filter, page: this.page(), limit: PAGE_SIZE };
    },
    stream: ({ params }) => this.api.incidents(params),
  });

  protected setFilter(filter: string): void {
    this.filter.set(filter);
    this.page.set(1);
  }

  protected start(incident: Incident): void {
    this.updating.run(this.api.updateIncident(incident.id, 'IN_PROGRESS'), () => {
      this.toast.success('operations.incidents.toast.updated');
      this.afterChange();
    });
  }

  protected onResolved(): void {
    this.resolving.set(null);
    this.afterChange();
  }

  private afterChange(): void {
    this.resource.reload();
    this.badges.refresh();
  }
}
