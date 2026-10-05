import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';

const CHECKLIST = ['ac', 'windows', 'waste', 'belongings', 'door'];

/** Self check-out with a short departure checklist (SRS STY-05); the API disables the key. */
@Component({
  selector: 'app-self-checkout-dialog',
  imports: [TranslatePipe, IconComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'account.stay.checkout.title' | translate" [subtitle]="'account.stay.checkout.subtitle' | translate" (closed)="closed.emit()">
      <div class="stack-sm">
        @for (item of items; track item; let i = $index) {
          <label class="check">
            <input type="checkbox" [checked]="checked()[i]" (change)="toggle(i, $any($event.target).checked)" />
            {{ 'account.stay.checkout.items.' + item | translate }}
          </label>
        }
      </div>
      <div class="notice gold mt-16 xs">
        <app-icon name="info" size="sm" />
        <div>{{ 'account.stay.checkout.notice' | translate }}</div>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="confirm()">{{ 'account.stay.checkout.confirm' | translate }}</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfCheckoutDialogComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly toast = inject(ToastService);

  readonly bookingId = input.required<Uuid>();
  readonly closed = output<void>();
  readonly checkedOut = output<void>();

  protected readonly items = CHECKLIST;
  protected readonly checked = signal(CHECKLIST.map(() => false));
  protected readonly busy = signal(false);
  private readonly complete = computed(() => this.checked().every(Boolean));

  protected toggle(index: number, value: boolean): void {
    this.checked.update((list) => list.map((c, i) => (i === index ? value : c)));
  }

  protected confirm(): void {
    if (!this.complete()) {
      this.toast.error('account.stay.checkout.incomplete');
      return;
    }
    this.busy.set(true);
    this.bookingsApi.checkout(this.bookingId()).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('account.stay.checkout.done');
        this.checkedOut.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }
}
