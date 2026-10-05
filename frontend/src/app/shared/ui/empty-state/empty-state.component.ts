import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Empty/placeholder state. Project an action button as content. Texts are already translated. */
@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <div class="empty">
      <div class="e-ic"><app-icon [name]="icon()" size="lg" /></div>
      <div class="e-t">{{ title() }}</div>
      @if (subtitle()) {
        <p class="mt-4 small">{{ subtitle() }}</p>
      }
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
