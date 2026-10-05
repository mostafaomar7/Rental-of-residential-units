import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Dashboard page heading: `<app-page-header [title]="…" [subtitle]="…">…actions…</app-page-header>`.
 * Projected content is rendered as the action buttons row. Texts are already translated.
 */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="page-h">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="row wrap actions"><ng-content /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .actions:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
