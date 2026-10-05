import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { map, of, switchMap } from 'rxjs';
import { DamageCase, ManagedBooking } from '@api/dto';
import { FieldApi } from '@api/endpoints/field.api';
import { HostOperationsApi } from '@api/endpoints/host-operations.api';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, SarPipe } from '@shared/pipes/format.pipes';
import { FieldComponent } from '@shared/ui/field/field.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Mutation } from '../services/mutation';

type BookingRef = Pick<ManagedBooking, 'id' | 'number' | 'guestName' | 'checkIn' | 'checkOut'>;

/** Bookings offered when searching for the stay a damage case belongs to. */
const SEARCH_LIMIT = 5;

/**
 * Opens a damage case against a stay, with optional photo evidence. Pass `booking` from a booking
 * page; without it the host searches the stay by booking number or guest.
 */
@Component({
  selector: 'app-open-damage-dialog',
  imports: [FormsModule, TranslatePipe, AppDatePipe, SarPipe, FieldComponent, ModalComponent],
  template: `
    <app-modal size="sm" [title]="'operations.damages.openTitle' | translate" (closed)="closed.emit()">
      <div class="stack">
        @if (selected(); as b) {
          <div class="soft">
            <div class="b small ltr">{{ b.number }}</div>
            <div class="xs muted">{{ b.guestName }} • {{ 'operator.common.range' | translate: { from: (b.checkIn | appDate), to: (b.checkOut | appDate) } }}</div>
            @if (!booking()) {
              <button type="button" class="link xs" (click)="selected.set(null)">{{ 'operations.damages.changeBooking' | translate }}</button>
            }
          </div>
        } @else {
          <app-field [label]="'operations.damages.booking' | translate" for="od-search">
            <input
              id="od-search"
              class="input"
              type="search"
              #search
              [placeholder]="'operations.bookings.searchPlaceholder' | translate"
              (keydown.enter)="query.set(search.value.trim())"
            />
          </app-field>
          @if (results.hasValue()) {
            <div class="rows">
              @for (r of results.value(); track r.id) {
                <button type="button" class="li click" (click)="selected.set(r)">
                  <span class="grow">
                    <span class="b small ltr d-block">{{ r.number }}</span>
                    <span class="xs muted">{{ r.guestName }} • {{ r.checkIn | appDate }}</span>
                  </span>
                </button>
              } @empty {
                <div class="xs muted">{{ 'operations.bookings.empty' | translate }}</div>
              }
            </div>
          }
        }
        <app-field [label]="'operations.damages.description' | translate" for="od-desc">
          <textarea id="od-desc" class="textarea" [(ngModel)]="description"></textarea>
        </app-field>
        <app-field
          [label]="'operations.damages.amount' | translate"
          for="od-amount"
          [help]="maxClaim() ? ('operations.damages.maxClaim' | translate: { amount: (maxClaim() | sar) }) : undefined"
        >
          <input id="od-amount" class="input" type="number" min="1" [max]="maxClaim() || null" [(ngModel)]="amount" />
        </app-field>
        <app-field [label]="'operations.damages.photos' | translate" for="od-photos">
          <input id="od-photos" class="input" type="file" accept="image/*" multiple (change)="onFiles($event)" />
        </app-field>
      </div>
      <ng-container modal-footer>
        <button type="button" class="btn btn-primary" [disabled]="opening.busy() || !valid()" (click)="open()">
          @if (opening.busy()) {
            <span class="spin"></span>
          }
          {{ 'operations.damages.openSubmit' | translate }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | translate }}</button>
      </ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenDamageDialogComponent {
  private readonly fieldApi = inject(FieldApi);
  private readonly operationsApi = inject(HostOperationsApi);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly booking = input<BookingRef>();
  readonly closed = output<void>();
  readonly opened = output<DamageCase>();

  protected readonly selected = linkedSignal<BookingRef | null>(() => this.booking() ?? null);
  protected readonly query = signal('');
  protected readonly description = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly files = signal<File[]>([]);
  protected readonly opening = new Mutation();
  protected readonly maxClaim = computed(() => this.catalog.settings()?.damage.maxClaimSar ?? 0);

  protected readonly results = rxResource({
    params: () => this.query() || undefined,
    stream: ({ params }) => this.operationsApi.bookings({ search: params, limit: SEARCH_LIMIT }).pipe(map((page) => page.items)),
  });

  protected readonly valid = computed(() => {
    const amount = this.amount() ?? 0;
    const max = this.maxClaim();
    return !!this.selected() && !!this.description().trim() && amount > 0 && (!max || amount <= max);
  });

  protected onFiles(event: Event): void {
    this.files.set(Array.from((event.target as HTMLInputElement).files ?? []));
  }

  protected open(): void {
    const booking = this.selected();
    if (!booking || !this.valid()) return;
    const files = this.files();
    const request = this.fieldApi
      .openDamageCase({ bookingId: booking.id, description: this.description().trim(), amountClaimed: this.amount() ?? 0 })
      .pipe(switchMap((created) => (files.length ? this.fieldApi.addDamagePhotos(created.id, files) : of(created))));
    this.opening.run(request, (created) => {
      this.toast.success('operations.damages.toast.opened', { number: created.number });
      this.opened.emit(created);
    });
  }
}
