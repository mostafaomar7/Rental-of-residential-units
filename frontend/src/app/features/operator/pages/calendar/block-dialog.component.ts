import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { Uuid } from '@api/api.types';
import { BlockReason } from '@api/dto';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { addDays } from '@core/utils/date.utils';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { DateRange } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';

const BLOCK_REASONS: readonly BlockReason[] = ['MAINTENANCE', 'OWNER_USE', 'OTHER'];

/** Closes the picked days for sale (one block per run of consecutive days). */
@Component({
  selector: 'app-block-dialog',
  imports: [FormsModule, TranslatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operator.calendar.blockTitle' | translate" [subtitle]="'operator.calendar.selectedCount' | translate: { count: days() }" (closed)="closed.emit()">
      <div class="stack">
        <app-field [label]="'operator.calendar.reason' | translate" for="cb-reason">
          <select id="cb-reason" class="select" [(ngModel)]="reason">
            @for (r of reasons; track r) {
              <option [ngValue]="r">{{ 'domain.api.blockReason.' + r | translate }}</option>
            }
          </select>
        </app-field>
        <app-field [label]="'operator.calendar.note' | translate" for="cb-note">
          <input id="cb-note" class="input" [(ngModel)]="note" />
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="blocking.busy()" (click)="block()">{{ 'operator.calendar.block' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockDialogComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);

  readonly unitId = input.required<Uuid>();
  readonly ranges = input.required<readonly DateRange[]>();
  /** Number of picked days (subtitle). */
  readonly days = input.required<number>();
  readonly closed = output<void>();
  readonly done = output<void>();

  protected readonly reasons = BLOCK_REASONS;
  protected readonly reason = signal<BlockReason>('MAINTENANCE');
  protected readonly note = signal('');
  protected readonly blocking = new Mutation();

  protected block(): void {
    const note = this.note().trim() || null;
    // Picked ranges are inclusive; a block's `endDate` is exclusive (like a check-out date).
    const requests = this.ranges().map((r) => this.api.block(this.unitId(), { startDate: r.startDate, endDate: addDays(r.endDate, 1), reason: this.reason(), note }));
    this.blocking.run(forkJoin(requests), () => {
      this.toast.success('operator.calendar.blocked', { count: this.days() });
      this.done.emit();
    });
  }
}
