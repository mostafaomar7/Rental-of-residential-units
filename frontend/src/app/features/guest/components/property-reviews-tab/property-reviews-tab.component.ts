import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { PropertyReviewsQuery } from '@api/dto';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { MeApi } from '@api/endpoints/me.api';
import { AuthService } from '@core/services/auth.service';
import { AppDatePipe, NumPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StarsComponent } from '@shared/ui/stars/stars.component';
import { LoadStateComponent } from '../load-state/load-state.component';

type ReviewFilter = 'newest' | 'highest' | 'lowest' | 'photos';
const REVIEW_FILTERS: readonly ReviewFilter[] = ['newest', 'highest', 'lowest', 'photos'];
const PAGE_SIZE = 10;

function reviewsQuery(filter: ReviewFilter, limit: number): PropertyReviewsQuery {
  return filter === 'photos' ? { sort: 'newest', withPhotos: true, limit } : { sort: filter, limit };
}

/** "Reviews" tab of the unit page: average, rating distribution, sorting and the review list (SRS §REV). */
@Component({
  selector: 'app-property-reviews-tab',
  imports: [RouterLink, TranslatePipe, NumPipe, AppDatePipe, IconComponent, StarsComponent, LoadStateComponent],
  template: `
    @if (reviews.hasValue()) {
      @let summary = reviews.value().summary;
      <div class="grid g2 summary">
        <div class="center soft-lg">
          <div class="avg">{{ summary.average | num }}</div>
          <div class="row justify-center"><app-stars [value]="summary.average" /></div>
          <div class="small muted mt-4">{{ 'guest.property.reviews.summary' | translate: { count: summary.count } }}</div>
        </div>
        <div class="stack-sm">
          @for (d of distribution(); track d.stars) {
            <div class="rate-bar">
              <span class="b">{{ d.stars }}★</span>
              <div class="bar"><div [style.width.%]="d.percent"></div></div>
              <span class="xs muted">{{ d.percent }}%</span>
            </div>
          }
        </div>
      </div>
    }

    @if (pendingReview(); as pending) {
      <div class="notice gold mt-16">
        <app-icon name="star" />
        <div class="grow">{{ 'guest.property.reviews.prompt' | translate: { points: pending.rewardPoints } }}</div>
        <a class="btn btn-primary btn-xs" [routerLink]="['/review', pending.bookingId]">{{ 'guest.property.reviews.rateNow' | translate }}</a>
      </div>
    }

    <div class="row wrap mt-16">
      @for (f of filters; track f) {
        <button type="button" class="chip chip-sm" [class.on]="filter() === f" [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">
          {{ 'guest.property.reviews.sorts.' + f | translate }}
        </button>
      }
    </div>

    @if (reviews.hasValue()) {
      @let list = reviews.value().items;
      <div class="stack-sm mt-16">
        @for (r of list; track r.id) {
          <div class="review">
            <div class="row between">
              <div class="row">
                <div class="avatar avatar-sm">{{ r.guest.firstName.charAt(0) }}</div>
                <div>
                  <div class="b small">{{ r.guest.firstName }}</div>
                  <div class="xs muted">{{ 'guest.property.reviews.stayedIn' | translate: { month: (r.stayedIn | appDate: 'month'), unit: r.unit.name } }}</div>
                </div>
              </div>
              <app-stars [value]="r.rating" />
            </div>
            @if (r.comment) {
              <p class="small lh mt-8">{{ r.comment }}</p>
            }
            @if (r.photos.length) {
              <div class="thumbs-row mt-8">
                @for (photo of r.photos; track photo.id) {
                  <a [href]="photo.url" target="_blank" rel="noopener"><img [src]="photo.thumbUrl" [alt]="'guest.property.reviews.guestPhoto' | translate" /></a>
                }
              </div>
            }
            @if (r.reply) {
              <div class="owner-reply">
                <div class="xs b gold-dark">{{ 'guest.property.reviews.ownerReply' | translate }}</div>
                {{ r.reply.text }}
              </div>
            }
          </div>
        } @empty {
          <div class="empty small">{{ 'guest.property.reviews.empty' | translate }}</div>
        }
      </div>
      @if (filter() !== 'photos' && list.length < reviews.value().summary.count) {
        <div class="center mt-16">
          <button type="button" class="btn btn-ghost btn-sm" [disabled]="reviews.isLoading()" (click)="showMore()">{{ 'guest.property.reviews.more' | translate }}</button>
        </div>
      }
    } @else {
      <app-load-state [error]="reviews.error()" (retry)="reviews.reload()" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .summary {
      align-items: center;
    }
    .avg {
      font-size: 48px;
      font-weight: 900;
      line-height: 1;
    }
    .justify-center {
      justify-content: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyReviewsTabComponent {
  private readonly discoveryApi = inject(DiscoveryApi);
  private readonly meApi = inject(MeApi);
  private readonly auth = inject(AuthService);

  readonly propertyId = input.required<Uuid>();

  protected readonly filters = REVIEW_FILTERS;
  /** Resets to "newest" whenever another unit is shown. */
  protected readonly filter = linkedSignal<Uuid, ReviewFilter>({ source: () => this.propertyId(), computation: () => 'newest' });
  /** Grows with "show more"; starts over with each filter. */
  private readonly limit = linkedSignal<ReviewFilter, number>({ source: () => this.filter(), computation: () => PAGE_SIZE });

  protected readonly reviews = rxResource({
    params: () => ({ id: this.propertyId(), query: reviewsQuery(this.filter(), this.limit()) }),
    stream: ({ params }) => this.discoveryApi.reviews(params.id, params.query),
  });

  private readonly pending = rxResource({
    params: () => this.auth.user()?.id,
    stream: () => this.meApi.pendingReviews(),
  });

  /** A completed, unreviewed stay at this unit lets the signed-in guest leave a review. */
  protected readonly pendingReview = computed(() => (this.pending.hasValue() ? this.pending.value().find((r) => r.property.id === this.propertyId()) : undefined));

  protected readonly distribution = computed(() => {
    if (!this.reviews.hasValue()) return [];
    const { count, distribution } = this.reviews.value().summary;
    return ([5, 4, 3, 2, 1] as const).map((stars) => ({
      stars,
      percent: count ? Math.round(((distribution[`${stars}`] ?? 0) / count) * 100) : 0,
    }));
  });

  protected showMore(): void {
    this.limit.update((n) => n + PAGE_SIZE);
  }
}
