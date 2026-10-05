import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Photo } from '@api/dto';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/** Photo mosaic of a unit; any photo opens the full-size gallery scrolled to it. */
@Component({
  selector: 'app-property-gallery',
  imports: [TranslatePipe, IconComponent, ModalComponent],
  template: `
    @let imgs = photos();
    @if (imgs.length) {
      <div class="gallery">
        <button type="button" class="main" [attr.aria-label]="'guest.property.gallery.open' | translate" (click)="open(0)">
          <img [src]="imgs[0].url" [alt]="title()" />
        </button>
        <button type="button" class="side-img" [attr.aria-label]="'guest.property.gallery.photo' | translate: { n: 2 }" (click)="open(1)">
          <img [src]="(imgs.length > 1 ? imgs[1] : imgs[0]).thumbUrl" alt="" />
        </button>
        <button type="button" class="side-img" [attr.aria-label]="'guest.property.gallery.photo' | translate: { n: 3 }" (click)="open(2)">
          <img [src]="(imgs.length > 2 ? imgs[2] : imgs[0]).thumbUrl" alt="" />
          <span class="more pill pill-white"><app-icon name="images" />{{ 'guest.property.gallery.all' | translate: { count: imgs.length } }}</span>
        </button>
      </div>
    }

    @if (openAt() !== null) {
      <app-modal size="xl" [title]="title()" [subtitle]="'guest.property.gallery.subtitle' | translate" (closed)="openAt.set(null)">
        <div class="stack-sm">
          @for (photo of imgs; track photo.id) {
            <img class="full" [src]="photo.url" [alt]="photo.caption || ('guest.property.gallery.photo' | translate: { n: $index + 1 })" [attr.data-index]="$index" />
          }
        </div>
      </app-modal>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .full {
      width: 100%;
      border-radius: 18px;
      max-height: 560px;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyGalleryComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly photos = input.required<readonly Photo[]>();
  /** Property name, already localised. */
  readonly title = input.required<string>();

  /** Index of the photo the gallery was opened on; `null` while closed. */
  protected readonly openAt = signal<number | null>(null);

  protected open(index: number): void {
    this.openAt.set(index);
    afterNextRender(
      () => this.host.nativeElement.querySelector(`img.full[data-index="${index}"]`)?.scrollIntoView({ block: 'start' }),
      { injector: this.injector },
    );
  }
}
