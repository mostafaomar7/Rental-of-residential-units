import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { PropertyStatus } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { AdminQueuesService } from '../../admin-queues.service';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { VerificationCardComponent } from '../../components/verification-card.component';
import { PropertyReviewModalComponent } from './property-review-modal.component';

type StatusFilter = PropertyStatus | 'ALL';

const FILTERS: readonly TabItem<StatusFilter>[] = [
  { id: 'PENDING_REVIEW', label: 'status.property.PENDING_REVIEW' },
  { id: 'PUBLISHED', label: 'status.property.PUBLISHED' },
  { id: 'REJECTED', label: 'status.property.REJECTED' },
  { id: 'SUSPENDED', label: 'status.property.SUSPENDED' },
  { id: 'ALL', label: 'admin.common.all' },
];

const PAGE_SIZE = 10;

/** Property review queue: filter by status, search, open the full review. */
@Component({
  selector: 'app-property-queue',
  imports: [FormsModule, TranslatePipe, TabsComponent, EmptyStateComponent, IconComponent, VerificationCardComponent, PropertyReviewModalComponent, PagerComponent, ResourceStateComponent],
  template: `
    <div class="row between wrap mb-16">
      <app-tabs [items]="filters" [(active)]="status" />
      <div class="search search-box">
        <app-icon name="search" />
        <input
          type="search"
          [placeholder]="'admin.verification.searchPlaceholder' | translate"
          [attr.aria-label]="'common.search' | translate"
          [ngModel]="search()"
          (change)="search.set($any($event.target).value.trim())"
        />
      </div>
    </div>

    <app-resource-state [resource]="properties" />
    @if (properties.hasValue()) {
      @let page = properties.value();
      <div class="stack">
        @for (p of page.items; track p.id) {
          <app-verification-card [property]="p" (review)="reviewing.set(p.id)" />
        } @empty {
          <div class="card"><app-empty-state icon="check-check" [title]="'admin.verification.empty' | translate" /></div>
        }
      </div>
      <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
    }

    @if (reviewing(); as id) {
      <app-property-review-modal [propertyId]="id" (changed)="onChanged()" (closed)="reviewing.set(null)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .search-box {
      max-width: 300px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyQueueComponent {
  private readonly api = inject(AdminPlatformApi);
  private readonly queues = inject(AdminQueuesService);

  protected readonly filters = FILTERS;
  protected readonly status = signal<string>('PENDING_REVIEW');
  protected readonly search = signal('');
  /** Back to the first page whenever the filters change. */
  protected readonly currentPage = linkedSignal({ source: () => [this.status(), this.search()], computation: () => 1 });
  protected readonly reviewing = signal<Uuid | null>(null);

  protected readonly properties = rxResource({
    params: () => ({
      status: this.status() === 'ALL' ? undefined : (this.status() as PropertyStatus),
      search: this.search() || undefined,
      page: this.currentPage(),
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.api.properties(params),
  });

  protected onChanged(): void {
    this.properties.reload();
    this.queues.refresh();
  }
}
