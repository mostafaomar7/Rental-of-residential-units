import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { PendingReview } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { MeApi } from '@api/endpoints/me.api';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { PhotoPickerComponent } from '../../components/photo-picker/photo-picker.component';
import { StarInputComponent } from '../../components/star-input/star-input.component';
import { coverOf } from '../../utils/property-display';

const DEFAULT_RATING = 5;

/** Post-stay review (`/review/:bookingId`): rating, comment and photos (SRS §REV). */
@Component({
  selector: 'app-review-page',
  imports: [RouterLink, TranslatePipe, LocalizePipe, AppDatePipe, FieldComponent, IconComponent, LoadStateComponent, PhotoPickerComponent, StarInputComponent],
  templateUrl: './review.page.html',
  styles: `
    .review-wrap {
      padding-top: 24px;
      padding-bottom: 24px;
      max-width: 820px;
    }
    .unit-thumb {
      width: 90px;
      height: 72px;
      border-radius: 14px;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPage {
  readonly id = input.required<Uuid>();

  private readonly bookingsApi = inject(BookingsApi);
  private readonly meApi = inject(MeApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly booking = rxResource({ params: () => this.id(), stream: ({ params }) => this.bookingsApi.get(params) });
  protected readonly pending = rxResource({ stream: () => this.meApi.pendingReviews() });

  /** The booking's review slot; `null` once reviewed (or when not reviewable). */
  protected readonly pendingReview = computed<PendingReview | null>(() =>
    this.pending.hasValue() ? (this.pending.value().find((r) => r.bookingId === this.id()) ?? null) : null,
  );
  protected readonly cover = computed(() => (this.booking.hasValue() ? coverOf(this.booking.value().property) : null));

  protected readonly rating = signal(DEFAULT_RATING);
  protected readonly comment = signal('');
  protected readonly photos = signal<File[]>([]);
  protected readonly busy = signal(false);

  /** Publishes the review, then uploads its photos (a failed upload doesn't undo the review). */
  protected submit(pending: PendingReview): void {
    this.busy.set(true);
    this.meApi.createReview(pending.bookingId, this.rating(), this.comment().trim()).subscribe({
      next: (review) => {
        const photos = this.photos();
        if (!photos.length) {
          this.published(pending);
          return;
        }
        this.meApi.addReviewPhotos(review.id, photos).subscribe({
          next: () => this.published(pending),
          error: () => {
            this.toast.error('account.review.photosFailed');
            this.published(pending);
          },
        });
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }

  private published(pending: PendingReview): void {
    this.busy.set(false);
    this.toast.success('account.review.published', { points: pending.rewardPoints });
    void this.router.navigateByUrl('/account/reviews');
  }
}
