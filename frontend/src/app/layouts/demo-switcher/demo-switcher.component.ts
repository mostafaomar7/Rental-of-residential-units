import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DemoAccount } from '@core/auth/roles';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

type DemoRoleId = 'guest-visitor' | 'guest' | 'owner' | 'operator' | 'supervisor' | 'photographer' | 'admin';

interface DemoRole {
  id: DemoRoleId;
  icon: string;
  /** Seeded backend account to sign in as; `null` = signed out. */
  account: DemoAccount | null;
}

const DEMO_ROLES: readonly DemoRole[] = [
  { id: 'guest-visitor', icon: 'user', account: null },
  { id: 'guest', icon: 'user-check', account: 'guest' },
  { id: 'owner', icon: 'building-2', account: 'owner' },
  { id: 'operator', icon: 'layout-dashboard', account: 'operator' },
  { id: 'supervisor', icon: 'clipboard-check', account: 'supervisor' },
  { id: 'photographer', icon: 'camera', account: 'photographer' },
  { id: 'admin', icon: 'shield-check', account: 'admin' },
];

/**
 * Floating "Demo" menu (development builds only): signs in as one of the backend's seeded demo
 * accounts and opens that role's portal.
 */
@Component({
  selector: 'app-demo-switcher',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './demo-switcher.component.html',
  host: { '(document:click)': 'onDocumentClick($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoSwitcherComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  protected readonly enabled = this.auth.demoEnabled;
  protected readonly roles = DEMO_ROLES;
  protected readonly open = signal(false);
  protected readonly busy = signal(false);

  protected readonly currentRole = computed<DemoRoleId>(() => {
    const role = this.auth.role();
    if (!role) return 'guest-visitor';
    return role === 'GUEST' ? 'guest' : (role.toLowerCase() as DemoRoleId);
  });

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected switchTo(role: DemoRole): void {
    this.open.set(false);
    if (!role.account) {
      this.auth.logout('/');
      return;
    }
    this.busy.set(true);
    this.auth.loginAsDemo(role.account).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.toast.show('demo.switched', 'info', { role: this.translate.instant(`demo.roles.${role.id}.label`) });
        void this.router.navigateByUrl(user.role === 'GUEST' ? '/account' : this.auth.homeFor(user.role));
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.apiError(err);
      },
    });
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
