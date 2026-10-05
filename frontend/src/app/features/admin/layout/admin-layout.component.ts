import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { DashShellComponent } from '@layouts/dash-shell/dash-shell.component';
import { DashShellConfig } from '@layouts/dash-shell/dash-shell.model';
import { AdminQueuesService } from '../admin-queues.service';

/** Badge count for a queue: hidden when empty or unknown. */
const badge = (count: number | null): number | undefined => count || undefined;

/** Frame of the platform-admin console. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, TranslatePipe, IconComponent, DashShellComponent],
  template: `
    <app-dash-shell [config]="config()">
      <button side-extra type="button" class="btn btn-ghost btn-sm logout" (click)="logout()">
        <app-icon name="log-out" size="sm" [mirror]="true" />{{ 'admin.nav.logout' | translate }}
      </button>
      <router-outlet />
    </app-dash-shell>
  `,
  styles: `
    .logout {
      width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly queues = inject(AdminQueuesService);

  protected readonly config = computed<DashShellConfig>(() => {
    const q = this.queues.counts();
    const verification = (q.properties ?? 0) + (q.bankAccounts ?? 0);
    const photos = (q.photoShoots ?? 0) + (q.shootRequests ?? 0);

    return {
      badge: 'PLATFORM ADMIN',
      portalName: 'admin.nav.portalName',
      userName: this.auth.user()?.fullName ?? '',
      userRole: 'admin.nav.userRole',
      alertsLink: '/admin/integrations',
      alertCount: verification + (q.integrationIssues ?? 0),
      nav: [
        { section: 'admin.nav.sectionOverview' },
        { label: 'admin.nav.overview', icon: 'layout-dashboard', link: '/admin', exact: true },
        { section: 'admin.nav.sectionQuality' },
        { label: 'admin.nav.verification', icon: 'badge-check', link: '/admin/verification', count: badge(verification), alert: verification > 0 },
        { label: 'admin.nav.photos', icon: 'images', link: '/admin/photos', count: badge(photos), alert: photos > 0 },
        { label: 'admin.nav.disputes', icon: 'scale', link: '/admin/disputes', count: badge(q.disputes), alert: !!q.disputes },
        { section: 'admin.nav.sectionBusiness' },
        { label: 'admin.nav.bookings', icon: 'calendar-check', link: '/admin/bookings' },
        { label: 'admin.nav.finance', icon: 'banknote', link: '/admin/finance', count: badge(q.failedRefunds), alert: !!q.failedRefunds },
        { section: 'admin.nav.sectionGrowth' },
        { label: 'admin.nav.users', icon: 'users', link: '/admin/users' },
        { label: 'admin.nav.campaigns', icon: 'megaphone', link: '/admin/campaigns' },
        { section: 'admin.nav.sectionSystem' },
        { label: 'admin.nav.integrations', icon: 'plug', link: '/admin/integrations', count: badge(q.integrationIssues), alert: !!q.integrationIssues },
        { label: 'admin.nav.pricing', icon: 'sparkles', link: '/admin/pricing' },
        { label: 'admin.nav.settings', icon: 'settings', link: '/admin/settings' },
        { label: 'admin.nav.audit', icon: 'scroll-text', link: '/admin/audit' },
      ],
    };
  });

  protected logout(): void {
    this.auth.logout('/login');
  }
}
