import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertyStatus } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { SarPipe } from '@shared/pipes/format.pipes';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { PagerComponent } from '../../components/pager.component';

const PROPERTY_STATUSES: readonly PropertyStatus[] = ['PUBLISHED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'SUSPENDED'];
const PAGE_SIZE = 20;

/** `/operator/properties?status=&q=&page=` — the host's properties with status chips and search. */
@Component({
  selector: 'app-properties-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    SarPipe,
    IconComponent,
    PageHeaderComponent,
    StatusPillComponent,
    EmptyStateComponent,
    LoadingComponent,
    LoadErrorComponent,
    PagerComponent,
  ],
  templateUrl: './properties.page.html',
  styles: `
    .props-search {
      max-width: 320px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertiesPage {
  private readonly api = inject(HostPropertiesApi);
  private readonly router = inject(Router);

  readonly status = input<string>();
  readonly q = input<string>();
  readonly page = input<string>();

  protected readonly statuses = PROPERTY_STATUSES;
  protected readonly activeStatus = computed(() => PROPERTY_STATUSES.find((s) => s === this.status()) ?? null);

  protected readonly resource = rxResource({
    params: () => ({ status: this.activeStatus() ?? undefined, search: this.q() || undefined, page: Number(this.page()) || 1, limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.list(params),
  });

  protected setStatus(status: PropertyStatus | null): void {
    this.setParams({ status, page: null });
  }

  protected search(text: string): void {
    this.setParams({ q: text.trim() || null, page: null });
  }

  protected goToPage(page: number): void {
    this.setParams({ page: page > 1 ? String(page) : null });
  }

  protected open(id: string): void {
    void this.router.navigate(['/operator/property', id]);
  }

  private setParams(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
