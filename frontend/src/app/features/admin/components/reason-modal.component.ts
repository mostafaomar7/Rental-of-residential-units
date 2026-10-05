import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

/**
 * Asks for the reason / note of a decision (rejection, suspension, closing…). With `reasons`
 * (translation keys) a standard reason is picked first and the note is optional; the emitted text
 * is what the API stores and shows to the other party, so it is sent in the reviewer's language.
 */
@Component({
  selector: 'app-reason-modal',
  imports: [FormsModule, TranslatePipe, ModalComponent, FieldComponent],
  template: `
    <app-modal size="sm" [title]="title() | translate" (closed)="closed.emit()">
      @if (reasons().length) {
        <app-field class="mb-12" [label]="'admin.reason.preset' | translate" for="rm-reason">
          <select id="rm-reason" class="select" [(ngModel)]="preset">
            @for (r of reasons(); track r) {
              <option [value]="r">{{ r | translate }}</option>
            }
          </select>
        </app-field>
      }
      <app-field [label]="(label() || (reasons().length ? 'admin.reason.notes' : 'admin.reason.label')) | translate" for="rm-note">
        <textarea id="rm-note" class="textarea" [(ngModel)]="note"></textarea>
      </app-field>
      <ng-container modal-footer>
        <button type="button" class="btn" [class]="danger() ? 'btn-danger-solid' : 'btn-primary'" [disabled]="busy() || !valid()" (click)="submit()">
          {{ okLabel() | translate }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReasonModalComponent {
  private readonly translate = inject(TranslateService);

  /** Translation keys. */
  readonly title = input.required<string>();
  readonly okLabel = input('common.confirm');
  readonly label = input('');
  /** Standard reasons (translation keys); empty = free text only (then required). */
  readonly reasons = input<readonly string[]>([]);
  readonly danger = input(true);
  readonly busy = input(false);
  readonly confirmed = output<string>();
  readonly closed = output<void>();

  protected readonly preset = linkedSignal(() => this.reasons()[0] ?? '');
  protected readonly note = signal('');

  protected readonly valid = computed(() => !!this.note().trim() || !!this.preset());

  protected submit(): void {
    const preset = this.preset();
    const note = this.note().trim();
    const parts = [preset ? this.translate.instant(preset) : '', note].filter(Boolean);
    this.confirmed.emit(parts.join(' — '));
  }
}
