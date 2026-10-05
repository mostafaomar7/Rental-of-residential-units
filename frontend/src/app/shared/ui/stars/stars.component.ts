import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, IconSize } from '../icon/icon.component';

/** Read-only 5-star rating. */
@Component({
  selector: 'app-stars',
  imports: [IconComponent, TranslatePipe],
  template: `
    <span class="row" style="gap: 1px" role="img" [attr.aria-label]="'common.ratingOutOf5' | translate: { value: value() }">
      @for (filled of stars(); track $index) {
        <app-icon name="star" [size]="size()" [fill]="filled" [class]="filled ? 'star' : 'muted-2'" />
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarsComponent {
  readonly value = input.required<number>();
  readonly size = input<IconSize>('sm');

  protected readonly stars = computed(() => [1, 2, 3, 4, 5].map((i) => i <= Math.round(this.value())));
}
