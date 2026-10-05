import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LogoComponent } from '@shared/ui/brand/logo.component';
import { LangSwitchComponent } from '@shared/ui/brand/lang-switch.component';

export interface MobileTab {
  /** Translation key. */
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

/**
 * Mobile-first frame for the field apps. On desktop it shows inside a phone mock-up with a
 * description panel; at phone width it fills the screen.
 *
 * Slots: default (page body), `[head-right]` (header actions — set `showAvatar` false to replace the avatar), `[header-extra]`
 * (below the title bar), `[side-links]` (desktop side panel).
 */
@Component({
  selector: 'app-mobile-shell',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, IconComponent, LogoComponent, LangSwitchComponent],
  templateUrl: './mobile-shell.component.html',
  styles: `
    .app-mark {
      width: 32px;
      height: 32px;
      font-size: 16px;
    }
    .title-block {
      padding: 0 10px;
    }
    .sub {
      color: rgba(255, 255, 255, 0.6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileShellComponent {
  /** Already-translated texts. */
  readonly appName = input.required<string>();
  readonly appDescription = input('');
  readonly badge = input('');
  readonly title = input.required<string>();
  readonly subtitle = input('');
  /** Router link for the back button; when empty the app mark is shown instead. */
  readonly back = input<string | null>(null);
  readonly userInitial = input('');
  readonly showAvatar = input(true);
  readonly tabs = input.required<readonly MobileTab[]>();
}
