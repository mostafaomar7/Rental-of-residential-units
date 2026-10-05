import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Lucide icon styled by the design system's `.ic` classes.
 * Extra classes on the host (e.g. `class="gold"`) are kept.
 * `mirror` flips direction-sensitive icons (arrows, chevrons) in LTR — the prototype is drawn for RTL.
 */
@Component({
  selector: 'app-icon',
  imports: [LucideAngularModule],
  template: `<lucide-icon [name]="name()" [strokeWidth]="2" />`,
  styles: `
    :host lucide-icon,
    :host ::ng-deep svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: {
    class: 'ic',
    '[class.ic-sm]': "size() === 'sm'",
    '[class.ic-lg]': "size() === 'lg'",
    '[class.ic-xl]': "size() === 'xl'",
    '[class.ic-mirror]': 'mirror()',
    '[class.ic-fill]': 'fill()',
    'aria-hidden': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<IconSize>('md');
  readonly mirror = input(false);
  readonly fill = input(false);
}
