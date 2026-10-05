import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-logo',
  imports: [RouterLink, TranslatePipe],
  template: `
    <a class="logo" [routerLink]="link()" [attr.aria-label]="'app.homeLabel' | translate">
      <span class="logo-mark">{{ 'app.mark' | translate }}</span>
      <span class="logo-name">{{ 'app.name' | translate }}</span>
      @if (badge()) {
        <span class="pill-premium">{{ badge() }}</span>
      }
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  /** Already-translated badge text. */
  readonly badge = input('');
  readonly link = input('/');
}
