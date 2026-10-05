import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PortalService } from '@core/services/portal.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LogoComponent } from '@shared/ui/brand/logo.component';
import { FooterComponent } from '@shared/ui/brand/footer.component';
import { LangSwitchComponent } from '@shared/ui/brand/lang-switch.component';
import { DashNavLink, DashShellConfig, isNavLinkActive, isNavSection } from './dash-shell.model';

/**
 * Desktop dashboard frame (operator & admin portals): header, sidebar navigation and content.
 * Project the page (usually a `<router-outlet />`) as content; optional slots:
 * `[header-extra]` (header actions) and `[side-extra]` (card under the sidebar menu).
 */
@Component({
  selector: 'app-dash-shell',
  imports: [RouterLink, TranslatePipe, IconComponent, LogoComponent, FooterComponent, LangSwitchComponent],
  templateUrl: './dash-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashShellComponent {
  private readonly portal = inject(PortalService);

  readonly config = input.required<DashShellConfig>();

  protected readonly isSection = isNavSection;
  private readonly path = computed(() => this.portal.url().split(/[?#]/)[0]);

  protected isActive(link: DashNavLink): boolean {
    return isNavLinkActive(link, this.path());
  }
}
