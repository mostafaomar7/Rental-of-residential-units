import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CompareResult } from '@api/dto';
import { DiscoveryApi } from '@api/endpoints/discovery.api';
import { PortalService } from '@core/services/portal.service';
import { ToastService } from '@core/services/toast.service';
import { AppDatePipe, NumPipe, SarPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { CompareService } from '../../services/compare.service';
import { coverOf } from '../../utils/property-display';
import { LoadStateComponent } from '../load-state/load-state.component';

/**
 * Floating comparison tray (home and search pages) and the side-by-side comparison dialog
 * (`GET /properties/compare`). The best price and rating are highlighted.
 */
@Component({
  selector: 'app-compare-tray',
  imports: [RouterLink, TranslatePipe, LocalizePipe, SarPipe, NumPipe, AppDatePipe, IconComponent, ModalComponent, LoadStateComponent],
  templateUrl: './compare-tray.component.html',
  styles: `
    .tray-hint {
      color: rgba(255, 255, 255, 0.6);
    }
    .unit-title {
      color: var(--navy);
      white-space: normal;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareTrayComponent {
  private readonly discoveryApi = inject(DiscoveryApi);
  private readonly toast = inject(ToastService);
  private readonly portal = inject(PortalService);
  protected readonly compare = inject(CompareService);

  protected readonly dialogOpen = signal(false);
  protected readonly cover = coverOf;

  /** The tray belongs to the browsing pages only. */
  protected readonly visible = computed(() => {
    const path = this.portal.url().split(/[?#]/)[0];
    return (path === '/' || path === '/search') && this.compare.items().length > 0;
  });

  protected readonly result = rxResource({
    params: () => (this.dialogOpen() ? this.compare.ids() : undefined),
    stream: ({ params }) => this.discoveryApi.compare(params),
  });

  protected readonly best = computed(() => {
    const properties = this.result.hasValue() ? this.result.value().properties : [];
    return {
      price: Math.min(...properties.map((p) => p.price.nightly)),
      rating: Math.max(...properties.map((p) => p.rating)),
    };
  });

  /** Amenity names offered by a unit, in the catalogue's order. */
  protected amenitiesOf(result: CompareResult, codes: readonly string[]): CompareResult['amenities'] {
    return result.amenities.filter((a) => codes.includes(a.code));
  }

  protected open(): void {
    if (this.compare.items().length < 2) {
      this.toast.error('guest.compare.needTwo');
      return;
    }
    this.dialogOpen.set(true);
  }
}
