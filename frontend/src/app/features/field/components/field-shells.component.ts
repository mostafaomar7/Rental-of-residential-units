import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { MobileShellComponent } from '@layouts/mobile-shell/mobile-shell.component';
import { PHOTOGRAPHER_TABS, SUPERVISOR_TABS } from '../field.constants';

/*
 * App frames for the two field apps. Pages pass the (translated) title, optional subtitle and
 * back link; the optional `[head-right]` and `[header-extra]` slots are forwarded to the shell.
 * The avatar shows the signed-in user's initial.
 */

@Component({
  selector: 'app-supervisor-shell',
  imports: [MobileShellComponent, TranslatePipe],
  template: `
    <app-mobile-shell
      badge="FIELD"
      [appName]="'field.supervisor.appName' | translate"
      [appDescription]="'field.supervisor.appDescription' | translate"
      [title]="title()"
      [subtitle]="subtitle()"
      [back]="back()"
      [userInitial]="initial()"
      [showAvatar]="showAvatar()"
      [tabs]="tabs"
    >
      <ng-container ngProjectAs="[head-right]"><ng-content select="[head-right]" /></ng-container>
      <ng-container ngProjectAs="[header-extra]"><ng-content select="[header-extra]" /></ng-container>
      <ng-content />
    </app-mobile-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorShellComponent {
  private readonly auth = inject(AuthService);

  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly back = input<string | null>(null);
  readonly showAvatar = input(true);

  protected readonly tabs = SUPERVISOR_TABS;
  protected readonly initial = computed(() => this.auth.user()?.fullName.charAt(0) ?? '');
}

@Component({
  selector: 'app-photographer-shell',
  imports: [MobileShellComponent, TranslatePipe],
  template: `
    <app-mobile-shell
      badge="PHOTO"
      [appName]="'field.photographer.appName' | translate"
      [appDescription]="'field.photographer.appDescription' | translate"
      [title]="title()"
      [subtitle]="subtitle()"
      [back]="back()"
      [userInitial]="initial()"
      [showAvatar]="showAvatar()"
      [tabs]="tabs"
    >
      <ng-container ngProjectAs="[head-right]"><ng-content select="[head-right]" /></ng-container>
      <ng-container ngProjectAs="[header-extra]"><ng-content select="[header-extra]" /></ng-container>
      <ng-content />
    </app-mobile-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerShellComponent {
  private readonly auth = inject(AuthService);

  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly back = input<string | null>(null);
  readonly showAvatar = input(true);

  protected readonly tabs = PHOTOGRAPHER_TABS;
  protected readonly initial = computed(() => this.auth.user()?.fullName.charAt(0) ?? '');
}
