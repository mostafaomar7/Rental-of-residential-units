import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiTime, Uuid } from '@api/api.types';
import { StayRequest, StayRequestType } from '@api/dto';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

const toMinutes = (time: ApiTime): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (minutes: number): ApiTime => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Whole hours strictly between two times (`from` excluded, `to` included). */
function hourlySlots(from: ApiTime, to: ApiTime): ApiTime[] {
  const slots: ApiTime[] = [];
  for (let m = toMinutes(from) + 60; m <= toMinutes(to); m += 60) slots.push(toTime(m));
  return slots;
}

/**
 * Early check-in / late check-out request (SRS STY-04). Slots run from the earliest check-in
 * (or the stay's check-out) to the stay's check-in (or the latest check-out); the fee is taken
 * from the wallet at once and refunded if the host declines.
 */
@Component({
  selector: 'app-stay-request-dialog',
  imports: [TranslatePipe, AppDatePipe, SarPipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'account.stay.request.title.' + type() | translate" (closed)="closed.emit()">
      @if (slots().length) {
        <app-field [label]="'account.stay.request.timeLabel.' + type() | translate" for="rq-t">
          <select id="rq-t" class="select" (change)="selected.set($any($event.target).value)">
            @for (t of slots(); track t) {
              <option [value]="t" [selected]="t === selected()">{{ t | appDate: 'time' }}</option>
            }
          </select>
        </app-field>
        <p class="small mt-12">{{ 'account.stay.request.fee' | translate: { fee: (fee() | sar) } }}</p>
        <p class="xs muted mt-8 lh">{{ 'account.stay.request.hint' | translate }}</p>
      } @else {
        <p class="small muted">{{ 'account.stay.request.noSlots' | translate }}</p>
      }
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy() || !selected()" (click)="submit()">{{ 'account.stay.request.send' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StayRequestDialogComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly bookingId = input.required<Uuid>();
  readonly type = input.required<StayRequestType>();
  /** The stay's regular check-in / check-out times. */
  readonly checkInTime = input.required<ApiTime>();
  readonly checkOutTime = input.required<ApiTime>();
  readonly closed = output<void>();
  readonly requested = output<StayRequest>();

  private readonly rules = computed(() => this.catalog.settings()?.stay_changes ?? null);

  protected readonly slots = computed(() => {
    const rules = this.rules();
    if (!rules) return [];
    return this.type() === 'EARLY_CHECK_IN'
      ? hourlySlots(toTime(toMinutes(rules.earliestCheckIn) - 60), toTime(toMinutes(this.checkInTime()) - 60))
      : hourlySlots(this.checkOutTime(), rules.latestCheckOut);
  });
  protected readonly fee = computed(() => {
    const rules = this.rules();
    if (!rules) return 0;
    return this.type() === 'EARLY_CHECK_IN' ? rules.earlyCheckInFee : rules.lateCheckOutFee;
  });

  protected readonly selected = linkedSignal(() => this.slots()[0] ?? '');
  protected readonly busy = signal(false);

  protected submit(): void {
    this.busy.set(true);
    this.bookingsApi.requestStayChange(this.bookingId(), this.type(), this.selected()).subscribe({
      next: (request) => {
        this.busy.set(false);
        this.toast.success('account.stay.request.sent');
        this.requested.emit(request);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
