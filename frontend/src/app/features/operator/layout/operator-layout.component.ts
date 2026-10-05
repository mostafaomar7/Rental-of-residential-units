import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { DashShellComponent } from '@layouts/dash-shell/dash-shell.component';
import { DashNavEntry, DashShellConfig } from '@layouts/dash-shell/dash-shell.model';
import { OperatorBadgesService } from '../services/operator-badges.service';
import { OperatorPortfolioService } from '../services/operator-portfolio.service';
import { OperatorSessionService } from '../services/operator-session.service';

/** Frame of the owner/operator portal (same screens; the signed-in role changes badge and finance access). */
@Component({
  selector: 'app-operator-layout',
  imports: [RouterOutlet, RouterLink, TranslatePipe, IconComponent, DashShellComponent],
  providers: [OperatorBadgesService, OperatorPortfolioService],
  template: `
    <app-dash-shell [config]="config()">
      <a header-extra class="btn btn-gold btn-sm hide-sm" routerLink="/operator/add">
        <app-icon name="plus" size="sm" />{{ 'operator.nav.addUnit' | translate }}
      </a>
      <div side-extra>
        @if (badges.pendingPricing(); as pending) {
          <div class="loyal">
            <div class="row xs b gold"><app-icon name="sparkles" size="sm" />{{ 'operator.nav.pricing' | translate }}</div>
            <div class="small b mt-8 above">{{ 'operator.nav.pricingPending' | translate: { count: pending } }}</div>
            <a class="btn btn-gold btn-xs mt-12 above" routerLink="/operator/pricing">{{ 'operator.nav.review' | translate }}</a>
          </div>
        }
        <button type="button" class="btn btn-ghost btn-sm btn-block mt-12" (click)="session.logout()">
          <app-icon name="log-out" size="sm" [mirror]="true" />{{ 'operator.nav.logout' | translate }}
        </button>
      </div>
      <router-outlet />
    </app-dash-shell>
  `,
  styles: `
    .above {
      position: relative;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorLayoutComponent {
  protected readonly session = inject(OperatorSessionService);
  protected readonly badges = inject(OperatorBadgesService);

  protected readonly config = computed<DashShellConfig>(() => {
    const isOwner = this.session.isOwner();
    const pricing = this.badges.pendingPricing();
    const incidents = this.badges.openIncidents();
    const lockAlerts = this.badges.lockAlerts().length;

    const nav: DashNavEntry[] = [
      { section: 'operator.nav.sectionMain' },
      { label: 'operator.nav.dashboard', icon: 'layout-dashboard', link: '/operator', exact: true },
      { label: 'operator.nav.units', icon: 'building-2', link: '/operator/properties', activeOn: ['/operator/property', '/operator/add'] },
      { label: 'operator.nav.calendar', icon: 'calendar-days', link: '/operator/calendar' },
      { label: 'operator.nav.pricing', icon: 'sparkles', link: '/operator/pricing', count: pricing || undefined, alert: pricing > 0 },
      { label: 'operator.nav.bookings', icon: 'calendar-check', link: '/operator/bookings', activeOn: ['/operator/booking'] },
      { section: 'operator.nav.sectionOps' },
      { label: 'operator.nav.locks', icon: 'key-round', link: '/operator/locks', count: lockAlerts || undefined, alert: lockAlerts > 0 },
      { label: 'operator.nav.ops', icon: 'clipboard-list', link: '/operator/ops', count: incidents || undefined, alert: incidents > 0 },
      { label: 'operator.nav.reviews', icon: 'star', link: '/operator/reviews' },
    ];
    if (this.session.hasFinance()) {
      nav.push({ section: 'operator.nav.sectionFinance' }, { label: 'operator.nav.payouts', icon: 'banknote', link: '/operator/payouts' });
    }

    return {
      badge: isOwner ? 'OWNER PORTAL' : 'OPERATOR',
      portalName: isOwner ? 'operator.persona.owner.portal' : 'operator.persona.operator.portal',
      userName: this.session.userName(),
      userRole: `domain.api.role.${this.session.role() ?? 'OWNER'}`,
      alertsLink: '/operator/ops/incidents',
      alertCount: incidents + lockAlerts,
      nav,
    };
  });
}
