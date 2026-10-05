import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** The signed-in field user's profile (name, role, mobile) and the sign-out button. */
@Component({
  selector: 'app-profile-card',
  imports: [TranslatePipe, IconComponent],
  template: `
    @if (auth.user(); as user) {
      <div class="card card-p center">
        <div class="avatar big">{{ user.fullName.charAt(0) }}</div>
        <div class="bb mt-8">{{ user.fullName }}</div>
        <div class="xs muted">{{ 'domain.api.role.' + user.role | translate }}</div>
      </div>

      <div class="card card-p mt-12">
        <div class="setting-row">
          <div class="b small">{{ 'field.common.mobile' | translate }}</div>
          <span class="small ltr">{{ user.mobile }}</span>
        </div>
        @if (user.email) {
          <div class="setting-row">
            <div class="b small">{{ 'field.common.email' | translate }}</div>
            <span class="small ltr">{{ user.email }}</span>
          </div>
        }
      </div>
    }
    <ng-content />
    <button type="button" class="btn btn-ghost btn-block mt-12" (click)="auth.logout()">
      <app-icon name="log-out" size="sm" />{{ 'field.common.signOut' | translate }}
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .big {
      margin: 0 auto;
      width: 64px;
      height: 64px;
      font-size: 24px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCardComponent {
  protected readonly auth = inject(AuthService);
}
