import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ChecklistItem } from '@api/dto';
import { LocalizePipe } from '@shared/pipes/localize.pipe';

/** Tappable checklist (task checklist, shot list). Emits the toggled item; items in `saving` are locked. */
@Component({
  selector: 'app-checklist',
  imports: [TranslatePipe, LocalizePipe],
  template: `
    <div class="stack-sm">
      @for (item of items(); track item.key) {
        <button
          type="button"
          class="check-item"
          [class.done]="item.done"
          [attr.aria-pressed]="item.done"
          [attr.aria-busy]="saving().has(item.key)"
          [disabled]="disabled() || saving().has(item.key)"
          (click)="toggled.emit(item)"
        >
          <span class="cb">{{ item.done ? '✓' : '' }}</span>
          <span class="t grow">{{ item | loc: 'label' }}</span>
          @if (item.required) {
            <span class="xs muted">{{ 'field.task.required' | translate }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistComponent {
  readonly items = input.required<readonly ChecklistItem[]>();
  readonly disabled = input(false);
  readonly saving = input<ReadonlySet<string>>(new Set());
  readonly toggled = output<ChecklistItem>();
}
