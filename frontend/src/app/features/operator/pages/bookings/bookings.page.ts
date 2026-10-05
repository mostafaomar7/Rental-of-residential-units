import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BookingStatus } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { AppDatePipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { PagerComponent } from '../../components/pager.component';
import { OperatorPortfolioService } from '../../services/operator-portfolio.service';

/** Order of the status chips. */
const STATUS_FILTERS: readonly BookingStatus[] = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'PENDING_PAYMENT', 'CANCELLED', 'NO_SHOW'];
const PAGE_SIZE = 20;

/** `/operator/bookings?q=&status=&property=&from=&to=&page=` — bookings of the host's properties. */
@Component({
  selector: 'app-bookings-page',
  imports: [
    RouterLink,
    TranslatePipe,
    AppDatePipe,
    PluralPipe,
    SarPipe,
    LocalizePipe,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    StatusPillComponent,
    LoadingComponent,
    LoadErrorComponent,
    PagerComponent,
  ],
  templateUrl: './bookings.page.html',
  styles: `
    .bookings-search {
      max-width: 320px;
    }
    .filter {
      width: auto;
      min-width: 160px;
    }
    .unit-cell {
      max-width: 220px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsPage {
  private readonly api = inject(HostOperationsApi);
  private readonly router = inject(Router);
  protected readonly portfolio = inject(OperatorPortfolioService);

  /** Search text (also sent by the header search box). */
  readonly q = input<string>();
  readonly status = input<string>();
  readonly property = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly page = input<string>();

  protected readonly statuses = STATUS_FILTERS;
  protected readonly activeStatus = computed(() => STATUS_FILTERS.find((s) => s === this.status()) ?? null);
  protected readonly hasFilters = computed(() => !!(this.q() || this.activeStatus() || this.property() || this.from() || this.to()));

  protected readonly resource = rxResource({
    params: () => ({
      search: this.q() || undefined,
      status: this.activeStatus() ?? undefined,
      propertyId: this.property() || undefined,
      from: this.from() || undefined,
      to: this.to() || undefined,
      page: Number(this.page()) || 1,
      limit: PAGE_SIZE,
    }),
    stream: ({ params }) => this.api.bookings(params),
  });

  protected search(text: string): void {
    this.setParams({ q: text.trim() || null });
  }

  protected setStatus(status: BookingStatus | null): void {
    this.setParams({ status });
  }

  protected setFilter(key: 'property' | 'from' | 'to', value: string): void {
    this.setParams({ [key]: value || null });
  }

  protected reset(): void {
    this.setParams({ q: null, status: null, property: null, from: null, to: null });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected open(id: string): void {
    void this.router.navigate(['/operator/booking', id]);
  }

  /** Any filter change goes back to the first page. */
  private setParams(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: { ...queryParams, page: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
