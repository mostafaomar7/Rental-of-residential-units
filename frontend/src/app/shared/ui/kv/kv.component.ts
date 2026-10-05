import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Label/value row (receipts, details): `<app-kv [label]="…">{{ value }}</app-kv>`. */
@Component({
  selector: 'app-kv',
  template: `
    <div class="kv">
      <span>{{ label() }}</span>
      <span class="b"><ng-content /></span>
    </div>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KvComponent {
  readonly label = input.required<string>();
}
