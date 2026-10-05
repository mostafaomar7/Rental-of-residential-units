import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { PortalService } from '@core/services/portal.service';
import { SarPipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LogoComponent } from '@shared/ui/brand/logo.component';
import { FooterComponent } from '@shared/ui/brand/footer.component';
import { LangSwitchComponent } from '@shared/ui/brand/lang-switch.component';
import { NotificationsPopoverComponent } from '../components/notifications-popover/notifications-popover.component';
import { LoginDialogComponent } from '../components/login-dialog/login-dialog.component';
import { CompareTrayComponent } from '../components/compare-tray/compare-tray.component';
import { ActiveStayService } from '../services/active-stay.service';
import { CampaignAttributionService } from '../services/campaign-attribution.service';
import { FavoritesService } from '../services/favorites.service';
import { WalletService } from '../services/wallet.service';

/** Frame of the guest website: header, mobile nav, footer and guest-wide overlays. */
@Component({
  selector: 'app-guest-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    SarPipe,
    IconComponent,
    LogoComponent,
    FooterComponent,
    LangSwitchComponent,
    NotificationsPopoverComponent,
    LoginDialogComponent,
    CompareTrayComponent,
  ],
  templateUrl: './guest-layout.component.html',
  styles: `
    .login-btn {
      height: 40px;
    }
    .mobile-nav {
      padding-bottom: 10px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly portal = inject(PortalService);
  protected readonly auth = inject(AuthService);
  protected readonly favorites = inject(FavoritesService);
  protected readonly wallet = inject(WalletService);
  protected readonly activeStay = inject(ActiveStayService).stay;

  protected readonly firstName = computed(() => this.auth.user()?.fullName.split(' ')[0] ?? '');
  protected readonly unitsActive = computed(() => {
    const url = this.portal.url();
    return url === '/' || url.startsWith('/?') || url.startsWith('/property') || url.startsWith('/search');
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    // `?as=<demo account>` also works on public pages (development backends only).
    void this.auth.applyDemoLogin(params.get('as'));
    inject(CampaignAttributionService).landed(params.get('utm_campaign'));
  }

  /** Navigates to a member-only page, asking the visitor to sign in first. */
  protected openMemberPage(link: string): void {
    if (this.auth.ensureLoggedIn(link)) void this.router.navigateByUrl(link);
  }
}
