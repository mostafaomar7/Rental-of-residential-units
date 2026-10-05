import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { BookingsApi } from '@api/endpoints/bookings.api';
import { MeApi } from '@api/endpoints/me.api';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { StatTileComponent } from '@shared/ui/stat-tile/stat-tile.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { ActiveStayService } from '../../../services/active-stay.service';
import { WalletService } from '../../../services/wallet.service';
import { coverOf } from '../../../utils/property-display';

const RECENT_COUNT = 3;

/** Account overview: current stay, KPIs, recent bookings, loyalty tier and review reminder. */
@Component({
  selector: 'app-overview-tab',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    SarPipe,
    NumPipe,
    AppDatePipe,
    EmptyStateComponent,
    IconComponent,
    StatTileComponent,
    StatusPillComponent,
    LoadStateComponent,
  ],
  templateUrl: './overview-tab.component.html',
  styles: `
    :host {
      display: block;
    }
    .stay-hero {
      display: flex;
    }
    .key-ic {
      background: var(--gold);
      color: var(--navy);
    }
    .star-ic {
      background: #fbbf24;
      color: #fff;
    }
    .split {
      gap: 24px;
    }
    .min-0 {
      min-width: 0;
    }
    .end-col {
      text-align: end;
    }
    .soft-white {
      color: rgba(255, 255, 255, 0.7);
    }
    .faint {
      color: rgba(255, 255, 255, 0.6);
    }
    .review-notice {
      align-items: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
  private readonly bookingsApi = inject(BookingsApi);
  private readonly meApi = inject(MeApi);
  protected readonly wallet = inject(WalletService);
  protected readonly activeStay = inject(ActiveStayService).stay;

  protected readonly cover = coverOf;

  protected readonly recent = rxResource({ stream: () => this.bookingsApi.list('all', { limit: RECENT_COUNT }) });
  protected readonly loyalty = rxResource({ stream: () => this.meApi.loyalty() });
  private readonly reviewCount = rxResource({ stream: () => this.meApi.myReviews({ limit: 1 }).pipe(map((page) => page.meta.total)) });
  private readonly pendingReviews = rxResource({ stream: () => this.meApi.pendingReviews() });

  protected readonly bookingsTotal = computed(() => (this.recent.hasValue() ? this.recent.value().meta.total : '—'));
  protected readonly reviewsTotal = computed(() => (this.reviewCount.hasValue() ? this.reviewCount.value() : '—'));
  protected readonly pendingReview = computed(() => (this.pendingReviews.hasValue() ? (this.pendingReviews.value()[0] ?? null) : null));

  constructor() {
    this.wallet.reload();
  }
}
