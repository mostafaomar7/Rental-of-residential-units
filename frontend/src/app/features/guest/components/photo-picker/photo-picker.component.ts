import { ChangeDetectionStrategy, Component, effect, inject, input, model, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Upload limit of the photo endpoints. */
const MAX_PHOTOS = 10;

/**
 * Thumbnail row with an "add photo" tile: `<app-photo-picker [(files)]="photos" />`.
 * Holds the picked image files (uploaded by the caller) and previews them; a tap on a
 * thumbnail removes it.
 */
@Component({
  selector: 'app-photo-picker',
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="thumbs-row">
      @for (url of previews(); track url; let i = $index) {
        <button type="button" class="thumb-btn" [attr.aria-label]="'account.photos.remove' | translate" [disabled]="disabled()" (click)="remove(i)">
          <img [src]="url" [alt]="'account.photos.attached' | translate" />
        </button>
      }
      @if (files().length < max) {
        <label class="thumb-ph pick" [attr.aria-label]="'account.photos.add' | translate">
          <app-icon [name]="icon()" />
          <input type="file" accept="image/*" multiple hidden [disabled]="disabled()" (change)="onFiles($event)" />
        </label>
      }
    </div>
  `,
  styles: `
    .pick {
      cursor: pointer;
    }
    .thumb-btn {
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPickerComponent {
  private readonly toast = inject(ToastService);

  readonly files = model<File[]>([]);
  readonly icon = input('camera');
  readonly disabled = input(false);

  protected readonly max = MAX_PHOTOS;
  protected readonly previews = signal<string[]>([]);

  constructor() {
    effect((onCleanup) => {
      const urls = this.files().map((file) => URL.createObjectURL(file));
      this.previews.set(urls);
      onCleanup(() => urls.forEach((url) => URL.revokeObjectURL(url)));
    });
  }

  protected onFiles(event: Event): void {
    const field = event.target as HTMLInputElement;
    const picked = Array.from(field.files ?? []).filter((f) => f.type.startsWith('image/'));
    field.value = '';
    if (!picked.length) return;
    const room = MAX_PHOTOS - this.files().length;
    if (picked.length > room) this.toast.error('account.photos.limit', { max: MAX_PHOTOS });
    this.files.update((list) => [...list, ...picked.slice(0, room)]);
  }

  protected remove(index: number): void {
    this.files.update((list) => list.filter((_, i) => i !== index));
  }
}
