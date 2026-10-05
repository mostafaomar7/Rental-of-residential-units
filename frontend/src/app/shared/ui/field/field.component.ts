import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Form field wrapper: label + projected control + help/error text.
 * Pass `for` matching the control's `id` so the label is associated with it.
 */
@Component({
  selector: 'app-field',
  template: `
    <div class="field">
      <label [attr.for]="for()">{{ label() }}</label>
      <ng-content />
      @if (error()) {
        <div class="err-msg" role="alert">{{ error() }}</div>
      } @else if (help()) {
        <div class="help">{{ help() }}</div>
      }
    </div>
  `,
  styles: `:host { display: block; min-width: 0; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent {
  readonly label = input.required<string>();
  readonly for = input<string>();
  readonly help = input<string>();
  readonly error = input<string>();
}
