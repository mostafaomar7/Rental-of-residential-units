import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { User } from '@api/dto';
import { MeApi } from '@api/endpoints/me.api';
import { PluralPipe } from '@shared/pipes/format.pipes';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FavoritesService } from '../../../services/favorites.service';
import { ACCOUNT_NAV, AccountTab } from '../account-tabs';

/** Account navigation: profile, section links, logout and loyalty tier / free-cleaning progress. */
@Component({
  selector: 'app-account-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LocalizePipe, PluralPipe, IconComponent],
  template: `
    @let u = user();
    <aside class="side">
      <div class="side-card">
        <div class="side-user">
          <div class="avatar">{{ u.fullName.charAt(0) }}</div>
          <div>
            <div class="b">{{ u.fullName }}</div>
            <div class="xs muted row gap-4">
              @if (loyalty.hasValue()) {
                <span class="dot dot-gold"></span>{{ loyalty.value().tier | loc }}
              }
              @if (u.nafathVerified) {
                • <span class="green b">{{ 'account.sidebar.nafathVerified' | translate }}</span>
              }
            </div>
          </div>
        </div>
        <nav class="side-nav" [attr.aria-label]="'account.titles.account' | translate">
          @for (item of items(); track item.id) {
            <a [routerLink]="['/account', item.id]" routerLinkActive="on" ariaCurrentWhenActive="page">
              <span class="lbl"><app-icon [name]="item.icon" size="sm" />{{ 'account.nav.' + item.id | translate }}</span>
              @if (item.count) {
                <span class="cnt">{{ item.count }}</span>
              }
            </a>
          }
          <button type="button" class="logout" (click)="logout.emit()">
            <app-icon name="log-out" size="sm" [mirror]="true" />{{ 'account.nav.logout' | translate }}
          </button>
        </nav>
        @if (loyalty.hasValue()) {
          @let cleaning = loyalty.value().freeCleaning;
          <div class="loyal">
            <div class="row xs b gold"><app-icon name="gift" size="sm" />{{ 'account.sidebar.loyaltyReward' | translate }}</div>
            <div class="small b mt-8 loyal-text">
              @if (cleaning.available) {
                {{ cleaning.available | plural: 'account.sidebar.freeCleaningReady' }}
              } @else {
                {{ cleaning.every - cleaning.progress | plural: 'account.sidebar.freeCleaning' }}
              }
            </div>
            <div class="bar dark thin mt-12"><div [style.width.%]="(cleaning.progress / cleaning.every) * 100"></div></div>
          </div>
        }
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .loyal-text {
      line-height: 1.5;
      position: relative;
    }
    .dot-gold {
      background: var(--gold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSidebarComponent {
  private readonly meApi = inject(MeApi);
  private readonly favorites = inject(FavoritesService);

  readonly user = input.required<User>();
  readonly logout = output<void>();

  protected readonly loyalty = rxResource({
    params: () => this.user().id,
    stream: () => this.meApi.loyalty(),
  });

  private readonly counts = computed<Partial<Record<AccountTab, number>>>(() => ({ favorites: this.favorites.count() }));
  protected readonly items = computed(() => ACCOUNT_NAV.map((item) => ({ ...item, count: this.counts()[item.id] })));
}
