import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, concat, last, of } from 'rxjs';
import { Uuid } from '@api/api.types';
import { ManagedReview } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { ToastService } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { PhotoPickerComponent } from '../../../components/photo-picker/photo-picker.component';
import { StarInputComponent } from '../../../components/star-input/star-input.component';

/** Edits one of the guest's reviews: rating, comment, and its photos (remove / add). */
@Component({
  selector: 'app-review-edit-dialog',
  imports: [TranslatePipe, FieldComponent, ModalComponent, PhotoPickerComponent, StarInputComponent],
  template: `
    <app-modal size="sm" [title]="'account.reviews.editTitle' | translate" (closed)="closed.emit()">
      <div class="field">
        <span class="lbl">{{ 'account.reviews.rating' | translate }}</span>
        <app-star-input [(value)]="rating" [label]="'account.reviews.rating' | translate" />
      </div>
      <div class="mt-16">
        <app-field [label]="'account.reviews.comment' | translate" for="ed-c">
          <textarea id="ed-c" class="textarea" [value]="comment()" (input)="comment.set($any($event.target).value)"></textarea>
        </app-field>
      </div>
      <div class="field mt-16">
        <span class="lbl">{{ 'account.reviews.photos' | translate }}</span>
        @if (review().photos.length) {
          <div class="thumbs-row mb-8">
            @for (photo of review().photos; track photo.id) {
              @if (!removed().includes(photo.id)) {
                <button type="button" class="thumb-btn" [attr.aria-label]="'account.photos.remove' | translate" [disabled]="busy()" (click)="removePhoto(photo.id)">
                  <img [src]="photo.thumbUrl" [alt]="'account.photos.attached' | translate" />
                </button>
              }
            }
          </div>
        }
        <app-photo-picker icon="image-plus" [disabled]="busy()" [(files)]="newPhotos" />
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="save()">{{ 'account.reviews.saveEdit' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .thumb-btn {
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewEditDialogComponent {
  private readonly meApi = inject(MeApi);
  private readonly toast = inject(ToastService);

  readonly review = input.required<ManagedReview>();
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly rating = linkedSignal(() => this.review().rating);
  protected readonly comment = linkedSignal(() => this.review().comment ?? '');
  protected readonly removed = signal<Uuid[]>([]);
  protected readonly newPhotos = signal<File[]>([]);
  protected readonly busy = signal(false);

  protected removePhoto(photoId: Uuid): void {
    this.removed.update((ids) => [...ids, photoId]);
  }

  /** Saves the text, then applies the photo changes one request at a time. */
  protected save(): void {
    const id = this.review().id;
    const steps: Observable<unknown>[] = [
      this.meApi.updateReview(id, { rating: this.rating(), comment: this.comment().trim() || null }),
      ...this.removed().map((photoId) => this.meApi.removeReviewPhoto(id, photoId)),
    ];
    if (this.newPhotos().length) steps.push(this.meApi.addReviewPhotos(id, this.newPhotos()));
    this.busy.set(true);
    concat(...steps, of(null))
      .pipe(last())
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success('account.reviews.updated');
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.toast.apiError(err);
        },
      });
  }
}
