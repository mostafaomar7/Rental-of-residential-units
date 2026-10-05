import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

export interface RadioCardOption<T extends string = string> {
  value: T;
  icon: string;
  /** Translation keys. */
  label: string;
  hint?: string;
  /** Icon badge tone when not selected (defaults to plain). */
  tone?: 'navy' | 'gold' | 'green' | 'blue' | 'red' | 'amber';
}

/**
 * Two-column grid of selectable cards (the prototype's `.radio-card`).
 * Emits `picked` with the chosen value; the parent owns the state.
 */
@Component({
  selector: 'app-radio-cards',
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="grid g2" role="radiogroup">
      @for (o of options(); track o.value) {
        @let on = o.value === selected();
        <button type="button" role="radio" class="radio-card" [class.on]="on" [attr.aria-checked]="on" (click)="picked.emit(o.value)">
          <span class="row gap-12">
            <span class="li-ic" [class]="on && !o.tone ? 'navy' : (o.tone ?? '')"><app-icon [name]="o.icon" /></span>
            <span>
              <span class="b d-block">{{ o.label | translate }}</span>
              @if (o.hint) {
                <span class="xs muted">{{ o.hint | translate }}</span>
              }
            </span>
          </span>
          <span class="radio-dot"></span>
        </button>
      }
    </div>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioCardsComponent {
  readonly options = input.required<readonly RadioCardOption[]>();
  readonly selected = input<string>();
  readonly picked = output<string>();
}
