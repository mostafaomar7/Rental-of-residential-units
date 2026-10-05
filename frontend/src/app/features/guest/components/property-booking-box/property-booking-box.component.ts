import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Uuid } from '@api/api.types';
import { PropertyDetail, PublicUnit } from '@api/dto';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { LangService } from '@core/services/lang.service';
import { today } from '@core/utils/date.utils';
import { PluralPipe, SarPipe } from '@shared/pipes/format.pipes';
import { localize } from '@shared/pipes/localize.pipe';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../load-state/load-state.component';
import { QuoteBreakdownComponent } from '../quote-breakdown/quote-breakdown.component';
import { whatsappLink } from '../../utils/property-display';
import { quoteIssueKeys } from '../../utils/quote-issues';
import { StaySelection, stayParams, withValidCheckOut } from '../../utils/stay-dates';

/** Selling points listed under the booking button (`guest.property.book.perks.<n>`). */
const PERKS = [1, 2, 3, 4];

/** Sticky side panel of the unit page: unit and stay picker, live API quote, booking CTA and host card (SRS BKG-01..04). */
@Component({
  selector: 'app-property-booking-box',
  imports: [TranslatePipe, SarPipe, PluralPipe, IconComponent, FieldComponent, LoadStateComponent, QuoteBreakdownComponent],
  templateUrl: './property-booking-box.component.html',
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .price-lg {
      font-size: 24px;
    }
    .dates {
      gap: 8px;
    }
  `,
  // The host is the grid item, so it carries the sticky positioning.
  host: { class: 'sticky-book' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyBookingBoxComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LangService);
  private readonly discoveryApi = inject(DiscoveryApi);

  readonly property = input.required<PropertyDetail>();
  readonly unit = input.required<PublicUnit>();
  readonly stay = input.required<StaySelection>();
  readonly stayChange = output<StaySelection>();
  readonly unitChange = output<Uuid>();

  protected readonly minDate = today();
  protected readonly perks = PERKS;

  protected readonly quote = rxResource({
    // The signed-in user is part of the key: rewards are only quoted to members.
    params: () => ({ unitId: this.unit().id, stay: this.stay(), viewer: this.auth.user()?.id }),
    stream: ({ params }) => this.discoveryApi.quote(params.unitId, params.stay),
  });

  protected readonly guestOptions = computed(() => Array.from({ length: this.unit().maxGuests }, (_, i) => i + 1));
  protected readonly issues = computed(() => {
    this.lang.lang();
    return this.quote.hasValue() ? quoteIssueKeys(this.quote.value().issues, this.translate) : [];
  });
  protected readonly discountPercent = computed(() => {
    if (!this.quote.hasValue()) return 0;
    const { discount, originalAccommodation } = this.quote.value().pricing;
    return originalAccommodation ? Math.round((discount / originalAccommodation) * 100) : 0;
  });

  protected readonly whatsappUrl = computed(() => {
    const text = this.translate.instant('guest.property.host.whatsappText', { title: localize(this.property(), 'name', this.lang.lang()) });
    return whatsappLink(this.catalog.settings()?.support_whatsapp, text);
  });

  protected change(patch: Partial<StaySelection>): void {
    this.stayChange.emit(withValidCheckOut({ ...this.stay(), ...patch }));
  }

  /** Opens the booking wizard, asking the visitor to sign in first. */
  protected book(): void {
    const queryParams = { unit: this.unit().id, ...stayParams(this.stay()) };
    const url = this.router.serializeUrl(this.router.createUrlTree(['/book', this.property().id], { queryParams }));
    if (this.auth.ensureLoggedIn(url)) void this.router.navigateByUrl(url);
  }
}
