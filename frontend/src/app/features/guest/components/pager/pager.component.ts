import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Previous / next pager for paginated lists; hidden when everything fits on one page. */
@Component({
  selector: 'app-pager',
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (totalPages() > 1) {
      <nav class="row pager" [attr.aria-label]="'guest.pager.label' | translate">
        <button
          type="button"
          class="btn btn-ghost btn-icon btn-sm"
          [attr.aria-label]="'guest.pager.previous' | translate"
          [disabled]="page() <= 1 || disabled()"
          (click)="pageChange.emit(page() - 1)"
        >
          <app-icon name="chevron-right" size="sm" [mirror]="true" />
        </button>
        <span class="small muted b">{{ 'guest.pager.position' | translate: { page: page(), total: totalPages() } }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-icon btn-sm"
          [attr.aria-label]="'guest.pager.next' | translate"
          [disabled]="page() >= totalPages() || disabled()"
          (click)="pageChange.emit(page() + 1)"
        >
          <app-icon name="chevron-left" size="sm" [mirror]="true" />
        </button>
      </nav>
    }
  `,
  styles: `
    .pager {
      justify-content: center;
      padding-top: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  /** Disables both buttons, e.g. while the next page loads. */
  readonly disabled = input(false);
  readonly pageChange = output<number>();
}
