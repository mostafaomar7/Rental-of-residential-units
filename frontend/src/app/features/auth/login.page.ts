import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { User } from '@api/dto';
import { DEMO_ACCOUNTS, DemoAccount } from '@core/auth/roles';
import { AuthService } from '@core/services/auth.service';
import { ToastService, errorKey } from '@core/services/toast.service';
import { FieldComponent } from '@shared/ui/field/field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LangSwitchComponent } from '@shared/ui/brand/lang-switch.component';
import { LogoComponent } from '@shared/ui/brand/logo.component';

interface DemoShortcut {
  account: DemoAccount;
  icon: string;
}

const DEMO_SHORTCUTS: readonly DemoShortcut[] = [
  { account: 'owner', icon: 'building-2' },
  { account: 'operator', icon: 'layout-dashboard' },
  { account: 'supervisor', icon: 'clipboard-check' },
  { account: 'photographer', icon: 'camera' },
  { account: 'admin', icon: 'shield-check' },
  { account: 'guest', icon: 'user-check' },
];

/** Staff sign-in (mobile + password). Guests normally sign in with OTP from the website dialog. */
@Component({
  selector: 'app-login-page',
  imports: [TranslatePipe, FieldComponent, IconComponent, LogoComponent, LangSwitchComponent],
  templateUrl: './login.page.html',
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 24px 16px;
      background: var(--bg, #f6f7f9);
    }
    .login-card {
      width: min(420px, 100%);
    }
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .demo-grid .btn {
      justify-content: flex-start;
      height: auto;
      padding-block: 8px;
    }
    .demo-label {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.3;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  /** `?redirect=` set by the role guard. */
  readonly redirect = input<string>();

  protected readonly demoEnabled = this.auth.demoEnabled;
  protected readonly shortcuts = DEMO_SHORTCUTS;
  protected readonly demoMobiles = DEMO_ACCOUNTS;

  protected readonly mobile = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  /** Translation key of the last error, or `''`. */
  protected readonly error = signal('');

  protected submit(): void {
    const mobile = this.mobile().replace(/\s/g, '');
    if (!mobile || !this.password()) {
      this.error.set('auth.login.required');
      return;
    }
    this.run(this.auth.loginWithPassword(mobile, this.password()));
  }

  protected loginAsDemo(account: DemoAccount): void {
    this.run(this.auth.loginAsDemo(account));
  }

  private run(request: Observable<User>): void {
    this.busy.set(true);
    this.error.set('');
    request.subscribe({
      next: (user) => {
        this.busy.set(false);
        this.toast.success('auth.login.welcome', { name: user.fullName.split(' ')[0] });
        this.auth.completeLogin(user, this.redirect() || this.auth.homeFor(user.role));
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(errorKey(err, this.translate));
      },
    });
  }
}
