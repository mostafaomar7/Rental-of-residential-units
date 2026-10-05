import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { AccountTab, isAccountTab } from './account-tabs';
import { AccountSidebarComponent } from './components/account-sidebar.component';
import { BookingsTabComponent } from './tabs/bookings-tab.component';
import { ClaimsTabComponent } from './tabs/claims-tab.component';
import { FavoritesTabComponent } from './tabs/favorites-tab.component';
import { IdentityTabComponent } from './tabs/identity-tab.component';
import { OverviewTabComponent } from './tabs/overview-tab.component';
import { PointsTabComponent } from './tabs/points-tab.component';
import { ReviewsTabComponent } from './tabs/reviews-tab.component';
import { SettingsTabComponent } from './tabs/settings-tab.component';
import { WalletTabComponent } from './tabs/wallet-tab.component';

/** Guest account (`/account/:tab`): sidebar navigation plus one component per section. */
@Component({
  selector: 'app-account-page',
  imports: [
    AccountSidebarComponent,
    OverviewTabComponent,
    BookingsTabComponent,
    FavoritesTabComponent,
    WalletTabComponent,
    PointsTabComponent,
    ReviewsTabComponent,
    IdentityTabComponent,
    ClaimsTabComponent,
    SettingsTabComponent,
  ],
  template: `
    @if (user(); as u) {
      <div class="container dash">
        <app-account-sidebar [user]="u" (logout)="logout()" />
        <div class="account-main">
          @switch (activeTab()) {
            @case ('bookings') {
              <app-bookings-tab />
            }
            @case ('favorites') {
              <app-favorites-tab />
            }
            @case ('wallet') {
              <app-wallet-tab />
            }
            @case ('points') {
              <app-points-tab />
            }
            @case ('reviews') {
              <app-reviews-tab />
            }
            @case ('identity') {
              <app-identity-tab />
            }
            @case ('claims') {
              <app-claims-tab />
            }
            @case ('settings') {
              <app-settings-tab />
            }
            @default {
              <app-overview-tab />
            }
          }
        </div>
      </div>
    }
  `,
  styles: `
    .account-main {
      min-width: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly tab = input.required<string>();

  protected readonly user = this.auth.user;
  /** Unknown sections fall back to the overview. */
  protected readonly activeTab = computed<AccountTab>(() => {
    const tab = this.tab();
    return isAccountTab(tab) ? tab : 'overview';
  });

  protected logout(): void {
    this.auth.logout();
    this.toast.show('account.settings.loggedOut');
  }
}
