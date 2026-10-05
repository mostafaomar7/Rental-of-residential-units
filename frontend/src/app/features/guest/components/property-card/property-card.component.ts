import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PropertyCard } from '@api/dto';
import { ToastService } from '@core/services/toast.service';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CompareService } from '../../services/compare.service';
import { FavoritesService } from '../../services/favorites.service';
import { coverOf } from '../../utils/property-display';

/** Unit card used on home, search, favourites (SRS DSC-05). */
@Component({
  selector: 'app-property-card',
  imports: [RouterLink, TranslatePipe, LocalizePipe, SarPipe, NumPipe, IconComponent],
  templateUrl: './property-card.component.html',
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .ucard-img > a {
      display: block;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyCardComponent {
  private readonly favorites = inject(FavoritesService);
  private readonly compare = inject(CompareService);
  private readonly toast = inject(ToastService);

  readonly property = input.required<PropertyCard>();
  /** Query params forwarded to the detail page (e.g. searched dates). */
  readonly queryParams = input<Record<string, string>>({});

  protected readonly cover = computed(() => coverOf(this.property()));
  protected readonly isFavorite = computed(() => this.favorites.isFavorite(this.property().id, this.property().isFavorite));
  protected readonly favoriteBusy = computed(() => this.favorites.isBusy(this.property().id));
  protected readonly inCompare = computed(() => this.compare.has(this.property().id));

  protected toggleFavorite(): void {
    this.favorites.toggle(this.property().id, this.isFavorite());
  }

  protected toggleCompare(): void {
    if (!this.compare.toggle(this.property())) this.toast.error('guest.compare.limit', { max: this.compare.max() });
  }
}
