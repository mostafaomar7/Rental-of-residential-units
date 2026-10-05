import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { ManagedReview } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StarsComponent } from '@shared/ui/stars/stars.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { PagerComponent } from '../../../components/pager/pager.component';
import { ReviewEditDialogComponent } from '../components/review-edit-dialog.component';

const PAGE_SIZE = 10;

/** Stays waiting for a review, and the guest's published reviews with edit / delete (SRS §REV). */
@Component({
  selector: 'app-reviews-tab',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    AppDatePipe,
    EmptyStateComponent,
    IconComponent,
    StarsComponent,
    StatusPillComponent,
    LoadStateComponent,
    PagerComponent,
    ReviewEditDialogComponent,
  ],
  template: `
    <h2 class="h2 mb-16">{{ 'account.nav.reviews' | translate }}</h2>

    @if (pending.hasValue() && pending.value().length) {
      <div class="stack-sm mb-16">
        @for (p of pending.value(); track p.bookingId) {
          <div class="notice amber row between wrap">
            <div>
              <div class="b">{{ p.property | loc }}</div>
              <div class="xs">
                {{ 'account.stay.dateRange' | translate: { from: (p.checkIn | appDate: 'medium'), to: (p.checkOut | appDate: 'medium') } }} •
                {{ 'account.reviews.pendingReward' | translate: { points: p.rewardPoints } }}
              </div>
            </div>
            <a class="btn btn-primary btn-sm" [routerLink]="['/review', p.bookingId]">{{ 'account.overview.rateNow' | translate }}</a>
          </div>
        }
      </div>
    }

    @if (mine.hasValue()) {
      @let page = mine.value();
      <div class="stack">
        @for (r of page.items; track r.id) {
          <div class="card card-p">
            <div class="row between">
              <div class="row">
                <app-stars [value]="r.rating" />
                @if (r.status === 'HIDDEN') {
                  <app-status-pill domain="review" [code]="r.status" />
                }
              </div>
              <div class="row">
                <button type="button" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'account.reviews.edit' | translate" (click)="editing.set(r)">
                  <app-icon name="pencil" size="sm" />
                </button>
                <button
                  type="button"
                  class="btn btn-danger btn-icon btn-sm"
                  [attr.aria-label]="'account.reviews.delete' | translate"
                  [disabled]="deleting() === r.id"
                  (click)="remove(r)"
                >
                  <app-icon name="trash-2" size="sm" />
                </button>
              </div>
            </div>
            <a class="bb mt-8 d-block" [routerLink]="['/property', r.property.id]">{{ r.property | loc }}</a>
            @if (r.comment) {
              <p class="small lh mt-4">{{ r.comment }}</p>
            }
            @if (r.photos.length) {
              <div class="thumbs-row mt-8">
                @for (photo of r.photos; track photo.id) {
                  <img [src]="photo.thumbUrl" [alt]="'account.photos.attached' | translate" />
                }
              </div>
            }
            <div class="xs muted mt-8">{{ r.createdAt | appDate: 'medium' }} • <span class="ltr">{{ r.bookingNumber }}</span></div>
            @if (r.hidden; as hidden) {
              <div class="notice red mt-8 xs"><app-icon name="eye-off" size="sm" /><div>{{ hidden.reason }}</div></div>
            }
            @if (r.reply) {
              <div class="owner-reply">
                <div class="xs b gold-dark">{{ 'account.reviews.ownerReply' | translate }}</div>
                {{ r.reply.text }}
              </div>
            }
          </div>
        } @empty {
          <div class="card">
            <app-empty-state icon="star" [title]="'account.reviews.emptyTitle' | translate" [subtitle]="'account.reviews.emptySub' | translate" />
          </div>
        }
      </div>
      <app-pager [page]="page.meta.page" [totalPages]="page.meta.totalPages" [disabled]="mine.isLoading()" (pageChange)="pageNo.set($event)" />
    } @else {
      <div class="card">
        <app-load-state [error]="mine.error()" (retry)="mine.reload()" />
      </div>
    }

    @if (editing(); as r) {
      <app-review-edit-dialog [review]="r" (closed)="editing.set(null)" (saved)="onSaved()" />
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsTabComponent {
  private readonly meApi = inject(MeApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly pageNo = signal(1);
  protected readonly mine = rxResource({
    params: () => this.pageNo(),
    stream: ({ params }) => this.meApi.myReviews({ page: params, limit: PAGE_SIZE }),
  });
  protected readonly pending = rxResource({ stream: () => this.meApi.pendingReviews() });

  protected readonly editing = signal<ManagedReview | null>(null);
  protected readonly deleting = signal<Uuid | null>(null);

  protected onSaved(): void {
    this.editing.set(null);
    this.mine.reload();
  }

  protected async remove(review: ManagedReview): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'account.reviews.deleteTitle',
      message: 'account.reviews.deleteMessage',
      okLabel: 'account.reviews.delete',
      danger: true,
    });
    if (!ok) return;
    this.deleting.set(review.id);
    this.meApi.deleteReview(review.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.toast.show('account.reviews.deleted');
        this.mine.reload();
        this.pending.reload();
      },
      error: (err: unknown) => {
        this.deleting.set(null);
        this.toast.apiError(err);
      },
    });
  }
}
