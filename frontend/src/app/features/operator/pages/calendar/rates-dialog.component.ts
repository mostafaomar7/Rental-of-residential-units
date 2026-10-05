import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { Uuid } from '@api/api.types';
import { HostPropertiesApi } from '@api/endpoints/host-properties.api';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { WEEKDAY_SAMPLE } from '../../services/calendar-grid';
import { DateRange } from '../../services/date-ranges';
import { Mutation } from '../../services/mutation';

/**
 * Nightly price and minimum stay for the picked days (one request per run of consecutive days),
 * optionally limited to some weekdays — or clears those overrides back to the unit's base rules.
 */
@Component({
  selector: 'app-rates-dialog',
  imports: [FormsModule, TranslatePipe, AppDatePipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operator.calendar.ratesTitle' | translate" [subtitle]="'operator.calendar.selectedCount' | translate: { count: days() }" (closed)="closed.emit()">
      <div class="stack">
        <div class="grid g2">
          <app-field [label]="'operator.calendar.price' | translate" for="cr-price">
            <input id="cr-price" class="input" type="number" min="1" [(ngModel)]="price" />
          </app-field>
          <app-field [label]="'operator.calendar.minNights' | translate" for="cr-min">
            <input id="cr-min" class="input" type="number" min="1" [(ngModel)]="minNights" />
          </app-field>
        </div>
        <div>
          <div class="xs muted b mb-8">{{ 'operator.calendar.weekdays' | translate }}</div>
          <div class="chips">
            @for (d of weekdays; track d; let i = $index) {
              <button type="button" class="chip chip-sm" [class.on]="picked().includes(i)" [attr.aria-pressed]="picked().includes(i)" (click)="toggleWeekday(i)">
                {{ d | appDate: 'weekdayShort' }}
              </button>
            }
          </div>
          <div class="xs muted mt-4">{{ 'operator.calendar.weekdaysHint' | translate }}</div>
        </div>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="saving.busy() || !valid()" (click)="save()">{{ 'common.save' | translate }}</button>
        <button type="button" class="btn btn-ghost" [disabled]="saving.busy()" (click)="clear()">{{ 'operator.calendar.clearRates' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatesDialogComponent {
  private readonly api = inject(HostPropertiesApi);
  private readonly toast = inject(ToastService);

  readonly unitId = input.required<Uuid>();
  readonly ranges = input.required<readonly DateRange[]>();
  readonly days = input.required<number>();
  readonly closed = output<void>();
  readonly done = output<void>();

  protected readonly weekdays = WEEKDAY_SAMPLE;
  protected readonly price = signal<number | null>(null);
  protected readonly minNights = signal<number | null>(null);
  /** 0 = Sunday; empty = every day. */
  protected readonly picked = signal<number[]>([]);
  protected readonly saving = new Mutation();

  protected readonly valid = computed(() => (this.price() ?? 0) > 0 || (this.minNights() ?? 0) > 0);

  protected toggleWeekday(day: number): void {
    this.picked.update((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));
  }

  protected save(): void {
    const weekdays = this.picked().length ? this.picked() : undefined;
    const price = this.price() || null;
    const minNights = this.minNights() || null;
    const requests = this.ranges().map((r) => this.api.setRates(this.unitId(), { ...r, weekdays, price, minNights }));
    this.saving.run(forkJoin(requests), (results) => {
      this.toast.success('operator.calendar.ratesSaved', { count: results.reduce((sum, r) => sum + r.updatedDays, 0) });
      this.done.emit();
    });
  }

  protected clear(): void {
    const weekdays = this.picked().length ? this.picked() : undefined;
    const requests = this.ranges().map((r) => this.api.clearRates(this.unitId(), { ...r, weekdays }));
    this.saving.run(forkJoin(requests), () => {
      this.toast.show('operator.calendar.ratesCleared');
      this.done.emit();
    });
  }
}
