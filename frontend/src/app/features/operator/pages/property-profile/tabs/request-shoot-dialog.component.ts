import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ManagedProperty } from '@api/dto';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { ToastService } from '@core/services/toast.service';
import { addDays, today } from '@core/utils/date.utils';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Mutation } from '../../../services/mutation';
import { localInstant } from '../../../services/date-ranges';

/** Slots offered for a professional shoot (`HH:mm`). */
const SHOOT_SLOTS = ['10:00', '13:00', '16:00'] as const;
const DEFAULT_SLOT = '16:00';
const DEFAULT_LEAD_DAYS = 2;

/** Books a Rawaaf photographer: creates a PHOTO_SHOOT task the photographers' app picks up. */
@Component({
  selector: 'app-request-shoot-dialog',
  imports: [TranslatePipe, AppDatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal
      size="sm"
      [title]="'operator.profile.shoot.title' | translate"
      [subtitle]="'operator.profile.shoot.subtitle' | translate"
      (closed)="closed.emit()"
    >
      <div class="stack">
        <app-field [label]="'operator.profile.shoot.date' | translate" for="rp-d">
          <input id="rp-d" type="date" class="input" #d [value]="date()" [min]="today" (change)="date.set(d.value)" />
        </app-field>
        <app-field [label]="'operator.profile.shoot.time' | translate" for="rp-t">
          <select id="rp-t" class="select" #t (change)="time.set(t.value)">
            @for (slot of slots; track slot) {
              <option [value]="slot" [selected]="slot === time()">{{ slot | appDate: 'time' }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'operator.profile.shoot.notes' | translate" for="rp-n">
          <textarea id="rp-n" class="textarea" #n [placeholder]="'operator.profile.shoot.notesPlaceholder' | translate" (input)="notes.set(n.value)"></textarea>
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="requesting.busy()" (click)="confirm()">{{ 'operator.profile.shoot.confirm' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestShootDialogComponent {
  private readonly api = inject(HostOperationsApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly property = input.required<ManagedProperty>();
  readonly closed = output<void>();
  /** The shoot was booked (emitted before `closed`). */
  readonly requested = output<void>();

  protected readonly today = today();
  protected readonly slots = SHOOT_SLOTS;
  protected readonly date = signal(addDays(this.today, DEFAULT_LEAD_DAYS));
  protected readonly time = signal<string>(DEFAULT_SLOT);
  protected readonly notes = signal('');
  protected readonly requesting = new Mutation();

  protected confirm(): void {
    if (!this.date() || this.date() < this.today) {
      this.toast.error('operator.profile.shoot.invalidDate');
      return;
    }
    const body = {
      type: 'PHOTO_SHOOT' as const,
      propertyId: this.property().id,
      title: this.translate.instant('operator.profile.shoot.taskTitle'),
      notes: this.notes().trim() || null,
      dueAt: localInstant(this.date(), this.time()),
    };
    this.requesting.run(this.api.createTask(body), () => {
      this.toast.success('operator.profile.shoot.scheduled');
      this.requested.emit();
      this.closed.emit();
    });
  }
}
