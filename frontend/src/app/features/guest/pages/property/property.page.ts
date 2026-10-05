import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { AuthService } from '@core/services/auth.service';
import { ClipboardService } from '@core/services/clipboard.service';
import { NumPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../components/load-state/load-state.component';
import { PropertyBookingBoxComponent } from '../../components/property-booking-box/property-booking-box.component';
import { PropertyDetailsTabComponent } from '../../components/property-details-tab/property-details-tab.component';
import { PropertyGalleryComponent } from '../../components/property-gallery/property-gallery.component';
import { PropertyPoliciesTabComponent } from '../../components/property-policies-tab/property-policies-tab.component';
import { PropertyReviewsTabComponent } from '../../components/property-reviews-tab/property-reviews-tab.component';
import { UnitAvailabilityComponent } from '../../components/unit-availability/unit-availability.component';
import { FavoritesService } from '../../services/favorites.service';
import { StaySelection, stayParams, staySelection } from '../../utils/stay-dates';

type PropertyTab = 'details' | 'availability' | 'amenities' | 'policies' | 'reviews';
const TABS: readonly PropertyTab[] = ['details', 'availability', 'amenities', 'policies', 'reviews'];

/**
 * Unit detail page (SRS §DSC-07): gallery, tabs, availability, share, favourites and the booking box.
 * The selected unit and stay live in the URL (`?unit=&in=&out=&guests=`) so they survive reloads
 * and are shareable.
 */
@Component({
  selector: 'app-property-page',
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizePipe,
    NumPipe,
    IconComponent,
    LoadStateComponent,
    PropertyGalleryComponent,
    PropertyBookingBoxComponent,
    PropertyDetailsTabComponent,
    PropertyPoliciesTabComponent,
    PropertyReviewsTabComponent,
    UnitAvailabilityComponent,
  ],
  templateUrl: './property.page.html',
  styles: `
    .page {
      padding-top: 20px;
      padding-bottom: 24px;
    }
    .head {
      align-items: flex-end;
    }
    .body {
      gap: 24px;
      align-items: start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyPage {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly clipboard = inject(ClipboardService);
  private readonly discoveryApi = inject(DiscoveryApi);
  private readonly auth = inject(AuthService);
  protected readonly favorites = inject(FavoritesService);

  readonly id = input.required<Uuid>();
  readonly unitParam = input<string | undefined>(undefined, { alias: 'unit' });
  readonly checkIn = input<string | undefined>(undefined, { alias: 'in' });
  readonly checkOut = input<string | undefined>(undefined, { alias: 'out' });
  readonly guests = input<string>();

  protected readonly tabs = TABS;
  /** Back to "details" whenever another unit is opened. */
  protected readonly tab = linkedSignal<string, PropertyTab>({ source: () => this.id(), computation: () => 'details' });

  protected readonly property = rxResource({
    // Reloaded on sign-in so `isFavorite` reflects the member.
    params: () => ({ id: this.id(), viewer: this.auth.user()?.id }),
    stream: ({ params }) => this.discoveryApi.property(params.id),
  });

  protected readonly unit = computed(() => {
    if (!this.property.hasValue()) return null;
    const units = this.property.value().units;
    return units.find((u) => u.id === this.unitParam()) ?? units[0] ?? null;
  });

  protected readonly stay = computed(() => staySelection(this.checkIn(), this.checkOut(), this.guests(), this.unit()?.maxGuests));

  protected readonly isFavorite = computed(() =>
    this.property.hasValue() ? this.favorites.isFavorite(this.id(), this.property.value().isFavorite) : false,
  );

  protected updateStay(next: StaySelection): void {
    this.navigate({ ...stayParams(next) });
  }

  protected selectUnit(unitId: Uuid): void {
    this.navigate({ unit: unitId });
  }

  protected toggleFavorite(): void {
    this.favorites.toggle(this.id(), this.isFavorite());
  }

  protected share(): void {
    const url = location.href;
    if (typeof navigator.share === 'function') {
      navigator.share({ title: this.translate.instant('app.name'), url }).catch(() => undefined);
      return;
    }
    void this.clipboard.copy(url, 'guest.property.linkCopied');
  }

  private navigate(patch: Record<string, string>): void {
    const unit = this.unit();
    void this.router.navigate(['/property', this.id()], {
      replaceUrl: true,
      queryParams: { unit: unit?.id, ...stayParams(this.stay()), ...patch },
    });
  }
}
