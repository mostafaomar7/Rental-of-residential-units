import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Switch control: `<app-toggle [(checked)]="value" [label]="'…' | translate" />`. */
@Component({
  selector: 'app-toggle',
  template: `
    <label class="toggle">
      <input
        type="checkbox"
        [checked]="checked()"
        [disabled]="disabled()"
        [attr.aria-label]="label()"
        (change)="checked.set($any($event.target).checked)"
      />
      <span></span>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleComponent {
  readonly checked = model(false);
  readonly label = input('');
  readonly disabled = input(false);
}
