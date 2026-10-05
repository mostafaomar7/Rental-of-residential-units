import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { today } from '@core/utils/date.utils';
import { PluralPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { PropertyCardComponent } from '../../components/property-card/property-card.component';
import { CompareService } from '../../services/compare.service';
import { coverOf, propertyTypeIcon } from '../../utils/property-display';
import { DEFAULT_GUESTS, staySelection } from '../../utils/stay-dates';

const FEATURED_COUNT = 8;
const RECOMMENDED_COUNT = 12;
const GUEST_OPTIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 10];

const FEATURES: readonly { icon: string; key: string }[] = [
  { icon: 'key-round', key: 'smartAccess' },
  { icon: 'shield-check', key: 'nafath' },
  { icon: 'wallet', key: 'wallet' },
];

/** Guest landing page: hero with quick availability search, featured stays and the filterable grid (SRS §DSC). */
@Component({
  selector: 'app-home-page',
  imports: [TranslatePipe, LocalizePipe, PluralPipe, IconComponent, EmptyStateComponent, LoadStateComponent, PropertyCardComponent],
  templateUrl: './home.page.html',
  styles: `
    .hero-top {
      padding-top: 24px;
    }
    .filters {
      padding-top: 20px;
      padding-bottom: 8px;
    }
    .grid-wrap {
      padding-top: 12px;
      padding-bottom: 40px;
      scroll-margin-top: calc(var(--hdr) + 12px);
    }
    .featured {
      padding-top: 24px;
    }
    .features {
      padding-bottom: 24px;
    }
    .full-row {
      grid-column: 1 / -1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly discoveryApi = inject(DiscoveryApi);
  protected readonly auth = inject(AuthService);
  protected readonly catalog = inject(CatalogService);
  protected readonly compare = inject(CompareService);

  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  protected readonly guestOptions = GUEST_OPTIONS;
  protected readonly features = FEATURES;
  protected readonly typeIcon = propertyTypeIcon;
  protected readonly minDate = today();

  // Grid filters (city slug / property type code; '' = all)
  protected readonly cityFilter = signal('');
  protected readonly typeFilter = signal('');

  protected readonly featured = rxResource({
    params: () => ({ viewer: this.auth.user()?.id }),
    stream: () => this.discoveryApi.featured(FEATURED_COUNT),
  });

  protected readonly recommended = rxResource({
    params: () => ({ city: this.cityFilter(), type: this.typeFilter(), viewer: this.auth.user()?.id }),
    stream: ({ params }) =>
      this.discoveryApi.search({
        city: params.city || undefined,
        types: params.type ? [params.type] : undefined,
        sort: 'recommended',
        limit: RECOMMENDED_COUNT,
      }),
  });

  protected readonly heroImage = computed(() => {
    const first = this.featured.hasValue() ? this.featured.value()[0] : undefined;
    const url = first && coverOf(first);
    return url ? `url(${url})` : null;
  });
  /** Lowest tier's cashback — what every member gets. */
  protected readonly cashback = computed(() => {
    const tiers = this.catalog.settings()?.loyalty.tiers ?? [];
    return tiers.length ? Math.min(...tiers.map((t) => t.cashbackPercent)) : 0;
  });

  // Quick-search form state
  private readonly defaultStay = staySelection();
  protected readonly qsCity = signal('');
  protected readonly qsIn = signal(this.defaultStay.checkIn);
  protected readonly qsOut = signal(this.defaultStay.checkOut);
  protected readonly qsGuests = signal(DEFAULT_GUESTS);

  protected openDashboard(): void {
    if (this.auth.ensureLoggedIn('/account')) void this.router.navigateByUrl('/account');
  }

  protected scrollToGrid(): void {
    this.grid()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected quickSearch(): void {
    const checkIn = this.qsIn();
    const checkOut = this.qsOut();
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      this.toast.error('guest.dates.invalidRange');
      return;
    }
    void this.router.navigate(['/search'], {
      queryParams: { city: this.qsCity() || null, in: checkIn, out: checkOut, guests: this.qsGuests() },
    });
  }

  protected clearFilters(): void {
    this.cityFilter.set('');
    this.typeFilter.set('');
  }
}
