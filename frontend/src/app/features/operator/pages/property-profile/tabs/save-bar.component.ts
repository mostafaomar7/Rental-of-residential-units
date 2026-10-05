import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** "Save changes / Undo" row at the bottom of an editable profile layer. */
@Component({
  selector: 'app-save-bar',
  imports: [TranslatePipe],
  template: `
    <div class="row mt-24">
      <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="save.emit()">
        @if (busy()) {
          <span class="spin"></span>
        }
        {{ 'operator.profile.saveChanges' | translate }}
      </button>
      <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="revert.emit()">{{ 'operator.profile.undo' | translate }}</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveBarComponent {
  readonly busy = input(false);
  readonly save = output<void>();
  readonly revert = output<void>();
}
