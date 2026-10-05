import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ManagedReview } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { Mutation } from '../../services/mutation';

/** Ratings from this value get the "thank you" reply suggestion, below it the apology. */
const POSITIVE_RATING = 4;

/** The host's public reply to a review: write (with a rating-aware suggestion), edit or delete it. */
@Component({
  selector: 'app-review-reply-form',
  imports: [FormsModule, TranslatePipe, AppDatePipe, IconComponent],
  template: `
    @let reply = review().reply;
    @if (reply && !editing()) {
      <div class="owner-reply">
        <div class="row between">
          <div class="xs b gold-dark">{{ 'operations.reviews.yourReply' | translate }} • {{ reply.repliedAt | appDate: 'medium' }}</div>
          <div class="row gap-4">
            <button type="button" class="btn btn-ghost btn-xs" [disabled]="saving.busy()" (click)="editing.set(true)">{{ 'operations.reviews.edit' | translate }}</button>
            <button type="button" class="btn btn-danger btn-xs" [disabled]="saving.busy()" (click)="remove()">{{ 'operations.reviews.delete' | translate }}</button>
          </div>
        </div>
        {{ reply.text }}
      </div>
    } @else {
      <div class="row mt-12">
        <input
          class="input"
          [placeholder]="'operations.reviews.replyPlaceholder' | translate"
          [attr.aria-label]="'operations.reviews.replyLabel' | translate: { name: review().guest.firstName }"
          [(ngModel)]="text"
          (keydown.enter)="submit()"
        />
        <button type="button" class="btn btn-primary btn-sm" [disabled]="saving.busy() || !text().trim()" (click)="submit()">
          {{ (reply ? 'common.save' : 'operations.reviews.reply') | translate }}
        </button>
        @if (reply) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="cancelEdit()">{{ 'common.cancel' | translate }}</button>
        } @else {
          <button type="button" class="btn btn-ghost btn-sm hide-sm" (click)="suggest()">
            <app-icon name="sparkles" size="sm" />{{ 'operations.reviews.suggest' | translate }}
          </button>
        }
      </div>
    }
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewReplyFormComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);

  readonly review = input.required<ManagedReview>();
  readonly changed = output<ManagedReview>();

  protected readonly editing = signal(false);
  protected readonly text = linkedSignal(() => this.review().reply?.text ?? '');
  protected readonly saving = new Mutation();

  /** Suggested reply in the host's current language, adapted to the rating. */
  protected suggest(): void {
    const tone = this.review().rating >= POSITIVE_RATING ? 'positive' : 'negative';
    this.text.set(this.translate.instant(`operations.reviews.suggestion.${tone}`, { name: this.review().guest.firstName }));
  }

  protected submit(): void {
    const text = this.text().trim();
    if (!text) return;
    this.saving.run(this.api.reply(this.review().id, text), (review) => {
      this.editing.set(false);
      this.toast.success('operations.reviews.toast.published');
      this.changed.emit(review);
    });
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.text.set(this.review().reply?.text ?? '');
  }

  protected async remove(): Promise<void> {
    const ok = await this.confirm.ask({ message: 'operations.reviews.deleteConfirm', okLabel: 'operations.reviews.delete', danger: true });
    if (!ok) return;
    this.saving.run(this.api.deleteReply(this.review().id), () => {
      this.toast.show('operations.reviews.toast.deleted');
      this.changed.emit({ ...this.review(), reply: null });
    });
  }
}
