import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { AuthService } from '@core/services/auth.service';

/** Upcoming bookings scanned for a checked-in stay — more than any guest realistically has. */
const UPCOMING_SCAN = 20;

/** The signed-in guest's current (checked-in) stay, for the header link and the account overview. */
@Injectable({ providedIn: 'root' })
export class ActiveStayService {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly auth = inject(AuthService);

  private readonly resource = rxResource({
    params: () => this.auth.user()?.id,
    stream: () =>
      this.bookingsApi
        .list('upcoming', { limit: UPCOMING_SCAN })
        .pipe(map((page) => page.items.find((b) => b.status === 'CHECKED_IN') ?? null)),
  });

  readonly stay = computed(() => (this.resource.hasValue() ? this.resource.value() : null));

  reload(): void {
    this.resource.reload();
  }
}
