import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { BookingStatus } from '@api/dto';
import { AdminPlatformApi } from '@api/endpoints/admin-platform.api';
import { FORMAT_PIPES } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { PagerComponent } from '../../components/pager.component';
import { ResourceStateComponent } from '../../components/resource-state.component';
import { BookingDetailModalComponent } from './booking-detail-modal.component';

const STATUSES: readonly BookingStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'];
const PAGE_SIZE = 20;

/** `/admin/bookings?q=` — every booking on the platform: search, filters, detail with money split, cancel, invoice. */
@Component({
  selector: 'app-admin-bookings-page',
  imports: [FormsModule, TranslatePipe, FORMAT_PIPES, LocalizePipe, PageHeaderComponent, IconComponent, StatusPillComponent, EmptyStateComponent, PagerComponent, ResourceStateComponent, BookingDetailModalComponent],
  template: `
    <app-page-header [title]="'admin.bookings.title' | translate" [subtitle]="'admin.bookings.subtitle' | translate: { count: bookings.hasValue() ? bookings.value().meta.total : 0 }" />

    <div class="card card-p">
      <div class="row between wrap mb-16">
        <div class="search search-box">
          <app-icon name="search" />
          <input
            type="search"
            [placeholder]="'admin.bookings.searchPlaceholder' | translate"
            [attr.aria-label]="'common.search' | translate"
            [value]="search()"
            (change)="search.set($any($event.target).value.trim())"
          />
        </div>
        <div class="row wrap">
          <select class="select filter" [attr.aria-label]="'admin.bookings.status' | translate" [(ngModel)]="status">
            <option value="">{{ 'admin.common.all' | translate }}</option>
            @for (s of statuses; track s) {
              <option [value]="s">{{ 'status.booking.' + s | translate }}</option>
            }
          </select>
          <input class="input filter" type="date" [attr.aria-label]="'admin.bookings.from' | translate" [(ngModel)]="from" />
          <input class="input filter" type="date" [attr.aria-label]="'admin.bookings.to' | translate" [(ngModel)]="to" />
        </div>
      </div>

      <app-resource-state [resource]="bookings" />
      @if (bookings.hasValue()) {
        @let page = bookings.value();
        @if (page.items.length) {
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'admin.bookings.cols.booking' | translate }}</th>
                  <th>{{ 'admin.bookings.cols.property' | translate }}</th>
                  <th>{{ 'admin.bookings.cols.guest' | translate }}</th>
                  <th>{{ 'admin.bookings.cols.dates' | translate }}</th>
                  <th>{{ 'admin.bookings.cols.total' | translate }}</th>
                  <th>{{ 'admin.bookings.status' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (b of page.items; track b.id) {
                  <tr class="click" tabindex="0" (click)="viewing.set(b.id)" (keydown.enter)="viewing.set(b.id)">
                    <td>
                      <div class="b ltr">{{ b.number }}</div>
                      <div class="xs muted">{{ b.createdAt | appDate: 'medium' }}</div>
                    </td>
                    <td class="small">
                      {{ b.property | loc }}
                      <div class="xs muted">{{ b.unit.name }}</div>
                    </td>
                    <td class="small">
                      {{ b.guestName }}
                      <div class="xs muted ltr">{{ b.guestMobile }}</div>
                    </td>
                    <td class="small nowrap">
                      {{ 'admin.common.range' | translate: { from: (b.checkIn | appDate), to: (b.checkOut | appDate) } }}
                      <div class="xs muted">{{ b.nights | plural: 'common.nights' }}</div>
                    </td>
                    <td class="b nowrap">{{ b.pricing.total | sar }}</td>
                    <td><app-status-pill domain="booking" [code]="b.status" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state icon="calendar-x" [title]="'admin.bookings.empty' | translate" />
        }
        <app-pager [meta]="page.meta" (pageChange)="currentPage.set($event)" />
      }
    </div>

    @if (viewing(); as id) {
      <app-booking-detail-modal [bookingId]="id" (changed)="bookings.reload()" (closed)="viewing.set(null)" />
    }
  `,
  styles: `
    .search-box {
      max-width: 300px;
    }
    .filter {
      width: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBookingsPage {
  private readonly api = inject(AdminPlatformApi);

  /** Search text from the URL (`?q=`). */
  readonly q = input<string>();

  protected readonly statuses = STATUSES;
  protected readonly search = linkedSignal(() => this.q()?.trim() ?? '');
  protected readonly status = signal<BookingStatus | ''>('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    status: this.status() || undefined,
    from: this.from() || undefined,
    to: this.to() || undefined,
  }));
  protected readonly currentPage = linkedSignal({ source: this.filters, computation: () => 1 });
  protected readonly viewing = signal<Uuid | null>(null);

  protected readonly bookings = rxResource({
    params: () => ({ ...this.filters(), page: this.currentPage(), limit: PAGE_SIZE }),
    stream: ({ params }) => this.api.bookings(params),
  });
}
