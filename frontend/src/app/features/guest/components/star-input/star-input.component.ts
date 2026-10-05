import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, IconSize } from '@shared/ui/icon/icon.component';

/** Editable 1–5 star rating: `<app-star-input [(value)]="rating" />`. */
@Component({
  selector: 'app-star-input',
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="stars-input" [class.tight]="size() === 'sm'" role="radiogroup" [attr.aria-label]="label()">
      @for (star of stars; track star) {
        <button
          type="button"
          role="radio"
          [class.on]="star <= value()"
          [attr.aria-checked]="star === value()"
          [attr.aria-label]="(label() ? label() + ' ' : '') + ('account.review.starsLabel' | translate: { count: star })"
          (click)="value.set(star)"
        >
          <app-icon name="star" [size]="size()" />
        </button>
      }
    </div>
  `,
  styles: `
    .tight {
      gap: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarInputComponent {
  readonly value = model(5);
  /** Already-translated label, prefixed to each star's accessible name. */
  readonly label = input('');
  readonly size = input<IconSize>('md');

  protected readonly stars = [1, 2, 3, 4, 5];
}
