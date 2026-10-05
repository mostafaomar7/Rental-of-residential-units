import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MeApi } from '@api/endpoints/me.api';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoadStateComponent } from '../../../components/load-state/load-state.component';
import { PagerComponent } from '../../../components/pager/pager.component';
import { PropertyCardComponent } from '../../../components/property-card/property-card.component';
import { FavoritesService } from '../../../services/favorites.service';

const PAGE_SIZE = 12;

/** Saved units (SRS DSC-06); un-hearting a card removes it from the list. */
@Component({
  selector: 'app-favorites-tab',
  imports: [RouterLink, TranslatePipe, EmptyStateComponent, IconComponent, LoadStateComponent, PagerComponent, PropertyCardComponent],
  template: `
    <h2 class="h2 mb-16 row gap-4">
      {{ 'account.nav.favorites' | translate }} <app-icon name="heart" class="red" [fill]="true" /> {{ favorites.count() }}
    </h2>
    @if (list.hasValue()) {
      @let page = list.value();
      @if (page.items.length) {
        <div class="units fav-grid">
          @for (p of page.items; track p.id) {
            <app-property-card [property]="p" />
          }
        </div>
        <app-pager [page]="page.meta.page" [totalPages]="page.meta.totalPages" [disabled]="list.isLoading()" (pageChange)="pageNo.set($event)" />
      } @else {
        <div class="card">
          <app-empty-state icon="heart" [title]="'account.favorites.emptyTitle' | translate" [subtitle]="'account.favorites.emptySub' | translate">
            <a class="btn btn-primary mt-16" routerLink="/">{{ 'account.favorites.browse' | translate }}</a>
          </app-empty-state>
        </div>
      }
    } @else {
      <div class="card">
        <app-load-state [error]="list.error()" (retry)="list.reload()" />
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .fav-grid {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesTabComponent {
  private readonly meApi = inject(MeApi);
  protected readonly favorites = inject(FavoritesService);

  protected readonly pageNo = signal(1);
  protected readonly list = rxResource({
    // Reloads after every heart toggle.
    params: () => ({ page: this.pageNo(), version: this.favorites.version() }),
    stream: ({ params }) => this.meApi.favorites({ page: params.page, limit: PAGE_SIZE }),
  });
}
