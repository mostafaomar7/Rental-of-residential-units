import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SupervisorShellComponent } from '../../../components/field-shells.component';
import { ProfileCardComponent } from '../../../components/profile-card.component';

/** `/supervisor/me` — the signed-in supervisor's profile and sign-out. */
@Component({
  selector: 'app-supervisor-me-page',
  imports: [TranslatePipe, SupervisorShellComponent, ProfileCardComponent],
  template: `
    <app-supervisor-shell [title]="'field.common.me' | translate" [subtitle]="'field.supervisor.appName' | translate">
      <app-profile-card />
    </app-supervisor-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorMePage {}
