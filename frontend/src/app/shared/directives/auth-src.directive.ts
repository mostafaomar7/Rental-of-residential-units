import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiClient } from '@api/api-client.service';

/**
 * `<img [authSrc]="photo.thumbUrl">` for private files (operations photos, documents): fetches the
 * URL with the Authorization header and shows it through an object URL. Public photo URLs
 * (`/uploads/...`) don't need this — use plain `src`.
 */
@Directive({ selector: 'img[authSrc]' })
export class AuthSrcDirective {
  private readonly api = inject(ApiClient);
  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

  readonly authSrc = input.required<string | null | undefined>();

  private objectUrl: string | null = null;
  private loading: Subscription | null = null;

  constructor() {
    effect(() => this.load(this.authSrc()));
    inject(DestroyRef).onDestroy(() => this.release());
  }

  private load(url: string | null | undefined): void {
    this.release();
    if (!url) return;
    this.loading = this.api.blob(url).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.img.src = this.objectUrl;
      },
      error: () => this.img.removeAttribute('src'),
    });
  }

  private release(): void {
    this.loading?.unsubscribe();
    this.loading = null;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
