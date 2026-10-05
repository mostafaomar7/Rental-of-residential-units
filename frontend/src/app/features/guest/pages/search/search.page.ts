import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { OperatingModel, PropertySearchQuery, PropertySort } from '@api/dto';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { nightsBetween, today } from '@core/utils/date.utils';
import { AppDatePipe, PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { PagerComponent } from '../../components/pager/pager.component';
import { PropertyCardComponent } from '../../components/property-card/property-card.component';
import { MAX_GUESTS, StaySelection, stayParams, staySelection, withValidCheckOut } from '../../utils/stay-dates';

const SORTS: readonly PropertySort[] = ['recommended', 'price_asc', 'price_desc', 'rating', 'newest'];
const OPERATING_MODELS: readonly OperatingModel[] = ['SUPERVISED', 'SELF_SERVICE'];
/** Nightly price slider (SAR); the top value means "no limit". */
const PRICE_FILTER = { min: 100, max: 3000, step: 50 } as const;
const PAGE_SIZE = 12;

interface SearchCriteria extends StaySelection {
  q: string;
  city: string;
  type: string;
  maxPrice: number;
  model: OperatingModel | '';
  amenities: string[];
  sort: PropertySort;
  page: number;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | '' {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : '';
}

function toQuery(c: SearchCriteria): PropertySearchQuery {
  return {
    q: c.q || undefined,
    city: c.city || undefined,
    types: c.type ? [c.type] : undefined,
    amenities: c.amenities.length ? c.amenities : undefined,
    operatingModel: c.model || undefined,
    checkIn: c.checkIn,
    checkOut: c.checkOut,
    guests: c.guests,
    maxPrice: c.maxPrice < PRICE_FILTER.max ? c.maxPrice : undefined,
    sort: c.sort,
    page: c.page,
    limit: PAGE_SIZE,
  };
}

/**
 * Advanced search with availability (SRS §DSC). All criteria live in the URL
 * (`/search?q=&city=&in=&out=&guests=&type=&max=&model=&amenities=&sort=&page=`), so results are shareable.
 */
@Component({
  selector: 'app-search-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    SarPipe,
    AppDatePipe,
    PluralPipe,
    IconComponent,
    EmptyStateComponent,
    LoadStateComponent,
    PagerComponent,
    PropertyCardComponent,
  ],
  templateUrl: './search.page.html',
  styles: `
    .page {
      padding-top: 24px;
      padding-bottom: 24px;
    }
    .layout {
      padding-top: 0;
      grid-template-columns: 300px minmax(0, 1fr);
    }
    @media (max-width: 1023px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }
      .filters {
        position: static;
      }
    }
    .filters {
      position: sticky;
      top: 84px;
    }
    .dates {
      gap: 10px;
    }
    .guests-input {
      width: 70px;
    }
    .sort-select {
      width: auto;
      height: 40px;
    }
    .results {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly discoveryApi = inject(DiscoveryApi);
  private readonly auth = inject(AuthService);
  protected readonly catalog = inject(CatalogService);

  // Query params (bound by the router).
  readonly q = input<string>();
  readonly city = input<string>();
  readonly checkIn = input<string | undefined>(undefined, { alias: 'in' });
  readonly checkOut = input<string | undefined>(undefined, { alias: 'out' });
  readonly guests = input<string>();
  readonly type = input<string>();
  readonly max = input<string>();
  readonly model = input<string>();
  readonly amenities = input<string>();
  readonly sort = input<string>();
  readonly page = input<string>();

  protected readonly sorts = SORTS;
  protected readonly models = OPERATING_MODELS;
  protected readonly price = PRICE_FILTER;
  protected readonly minDate = today();

  protected readonly criteria = computed<SearchCriteria>(() => {
    const max = Number(this.max());
    return {
      ...staySelection(this.checkIn(), this.checkOut(), this.guests()),
      q: this.q() ?? '',
      city: this.city() ?? '',
      type: this.type() ?? '',
      maxPrice: max > 0 ? Math.min(max, PRICE_FILTER.max) : PRICE_FILTER.max,
      model: oneOf(this.model(), OPERATING_MODELS),
      amenities: (this.amenities() ?? '').split(',').filter(Boolean),
      sort: oneOf(this.sort(), SORTS) || 'recommended',
      page: Math.max(1, Math.floor(Number(this.page())) || 1),
    };
  });

  /** Live label of the price slider while dragging; the search itself runs on `change`. */
  protected readonly maxLabel = linkedSignal(() => this.criteria().maxPrice);

  protected readonly results = rxResource({
    // Reloaded on sign-in so cards carry `isFavorite`.
    params: () => ({ query: toQuery(this.criteria()), viewer: this.auth.user()?.id }),
    stream: ({ params }) => this.discoveryApi.search(params.query),
  });

  protected readonly nights = computed(() => Math.max(1, nightsBetween(this.criteria().checkIn, this.criteria().checkOut)));
  protected readonly cityName = computed(() => this.catalog.city(this.criteria().city) ?? null);
  /** Forwarded to the unit page so it opens with the searched stay. */
  protected readonly detailParams = computed(() => stayParams(this.criteria()));

  /** Applies filter changes; every change except paging starts again at page 1. */
  protected update(patch: Partial<SearchCriteria>): void {
    const current = this.criteria();
    const next = { ...current, page: 1, ...patch };
    const stay = withValidCheckOut(next);
    if (stay.checkOut !== next.checkOut) this.toast.show('guest.dates.autoAdjusted');
    void this.router.navigate(['/search'], {
      replaceUrl: true,
      queryParams: {
        q: next.q || null,
        city: next.city || null,
        ...stayParams(stay),
        type: next.type || null,
        max: next.maxPrice < PRICE_FILTER.max ? next.maxPrice : null,
        model: next.model || null,
        amenities: next.amenities.join(',') || null,
        sort: next.sort,
        page: next.page > 1 ? next.page : null,
      },
    });
  }

  protected toggleAmenity(code: string): void {
    const list = this.criteria().amenities;
    this.update({ amenities: list.includes(code) ? list.filter((c) => c !== code) : [...list, code] });
  }

  protected stepGuests(delta: number): void {
    this.setGuests(this.criteria().guests + delta);
  }

  protected setGuests(value: number): void {
    this.update({ guests: Math.max(1, Math.min(MAX_GUESTS, Math.round(value) || 1)) });
  }
}
