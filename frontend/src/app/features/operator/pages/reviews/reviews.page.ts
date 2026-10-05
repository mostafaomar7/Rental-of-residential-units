import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, map } from 'rxjs';
import { ManagedReview } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { AppDatePipe, NumPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StarsComponent } from '@shared/ui/stars/stars.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { TabItem, TabsComponent } from '@shared/ui/tabs/tabs.component';
import { LoadErrorComponent, LoadingComponent } from '../../components/async-state.component';
import { PagerComponent } from '../../components/pager.component';
import { ReviewReplyFormComponent } from './review-reply-form.component';

type ReviewFilter = 'all' | 'unanswered';
const PAGE_SIZE = 10;

/** `/operator/reviews` — guest reviews of the host's properties and the public replies. */
@Component({
  selector: 'app-reviews-page',
  imports: [
    TranslatePipe,
    AppDatePipe,
    NumPipe,
    LocalizePipe,
    EmptyStateComponent,
    PageHeaderComponent,
    StarsComponent,
    StatTileComponent,
    TabsComponent,
    LoadingComponent,
    LoadErrorComponent,
    PagerComponent,
    ReviewReplyFormComponent,
  ],
  template: `
    <app-page-header [title]="'operations.reviews.title' | translate" [subtitle]="'operations.reviews.subtitle' | translate" />

    <div class="grid g2 mb-16">
      <app-stat-tile icon="message-square" [value]="totals.hasValue() ? (totals.value().all | num) : '—'" [label]="'operations.reviews.stats.total' | translate" />
      <app-stat-tile
        icon="message-square-dashed"
        tone="red"
        [value]="totals.hasValue() ? (totals.value().unanswered | num) : '—'"
        [label]="'operations.reviews.stats.unanswered' | translate"
      />
    </div>

    <div class="card card-p">
      <div class="mb-16"><app-tabs [items]="tabs" [active]="filter()" (activeChange)="setFilter($event)" /></div>
      @if (resource.isLoading()) {
        <app-loading />
      } @else if (resource.error()) {
        <app-load-error [error]="resource.error()" (retry)="resource.reload()" />
      } @else if (resource.hasValue() && resource.value().items.length) {
        @let list = resource.value();
        <div class="stack-sm">
          @for (r of list.items; track r.id) {
            <div class="review">
              <div class="row between wrap">
                <div class="row">
                  <div class="avatar avatar-sm">{{ r.guest.firstName[0] }}</div>
                  <div>
                    <div class="b small">
                      {{ r.guest.firstName }} <span class="xs muted">• {{ r.createdAt | appDate: 'medium' }} • <span class="ltr">{{ r.bookingNumber }}</span></span>
                    </div>
                    <div class="xs gold-dark b">{{ r.property | loc }} • {{ r.unit.name }}</div>
                  </div>
                </div>
                <div class="row">
                  @if (r.status === 'HIDDEN') {
                    <span class="pill pill-gray" [title]="r.hidden?.reason ?? ''">{{ 'status.review.HIDDEN' | translate }}</span>
                  }
                  <app-stars [value]="r.rating" />
                </div>
              </div>
              @if (r.comment) {
                <p class="small lh mt-8">{{ r.comment }}</p>
              }
              @if (r.photos.length) {
                <div class="thumbs-row mt-8">
                  @for (photo of r.photos; track photo.id) {
                    <img [src]="photo.thumbUrl" [alt]="'operations.reviews.photoAlt' | translate" />
                  }
                </div>
              }
              <app-review-reply-form [review]="r" (changed)="onChanged($event)" />
            </div>
          }
        </div>
        <app-pager [meta]="list.meta" (pageChange)="page.set($event)" />
      } @else {
        <app-empty-state icon="check-check" [title]="'operations.reviews.empty' | translate" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsPage {
  private readonly api = inject(HostOperationsApi);

  protected readonly tabs: TabItem<ReviewFilter>[] = [
    { id: 'all', label: 'common.all' },
    { id: 'unanswered', label: 'operations.reviews.filters.noReply' },
  ];
  /** Bound to `app-tabs` (string ids); always one of {@link ReviewFilter}. */
  protected readonly filter = signal<string>('all');
  protected readonly page = signal(1);

  protected readonly resource = rxResource({
    params: () => ({ unanswered: this.filter() === 'unanswered' || undefined, page: this.page(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.reviews(params),
  });

  /** Review counters from the list totals (one item per request). */
  protected readonly totals = rxResource({
    stream: () =>
      forkJoin({
        all: this.api.reviews({ limit: 1 }).pipe(map((page) => page.meta.total)),
        unanswered: this.api.reviews({ unanswered: true, limit: 1 }).pipe(map((page) => page.meta.total)),
      }),
  });

  protected setFilter(filter: string): void {
    this.filter.set(filter);
    this.page.set(1);
  }

  protected onChanged(review: ManagedReview): void {
    this.resource.update((page) => page && { ...page, items: page.items.map((r) => (r.id === review.id ? review : r)) });
    this.totals.reload();
  }
}
